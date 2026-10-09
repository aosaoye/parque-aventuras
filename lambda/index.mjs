import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";

// Configuration
const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE_NAME = process.env.TABLE_NAME || "ParkAdventure";

// Initialize DynamoDB Client & Document Client (AWS SDK v3)
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

// Standard CORS Headers for API Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
  "Content-Type": "application/json",
};

/**
 * Validates standard email address format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === "string" && emailRegex.test(email.trim());
}

/**
 * Lambda Handler for POST /subcriptions via API Gateway
 * Table: ParkAdventure (arn:aws:dynamodb:us-east-1:131146365662:table/ParkAdventure)
 */
export const handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  // 1. Handle HTTP OPTIONS preflight request for CORS
  const httpMethod = event.httpMethod || event.requestContext?.http?.method;
  if (httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "CORS preflight OK" }),
    };
  }

  // Ensure method is POST
  if (httpMethod && httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: `Método ${httpMethod} no permitido. Utiliza POST.` }),
    };
  }

  try {
    // 2. Parse request payload safely
    let rawBody = event.body;
    if (event.isBase64Encoded && rawBody) {
      rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
    }

    let payload = {};
    if (typeof rawBody === "string") {
      try {
        payload = JSON.parse(rawBody);
      } catch (err) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message: "El cuerpo de la solicitud no es un JSON válido.",
          }),
        };
      }
    } else if (typeof rawBody === "object" && rawBody !== null) {
      payload = rawBody;
    }

    const {
      name,
      email,
      phone,
      date,
      experience = "campamento",
      people,
      count,
      guide = false,
      lunch = false,
      notes = "",
      totalPrice = null,
    } = payload;

    // 3. Validation
    const errors = [];
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      errors.push("El campo 'name' es requerido (mínimo 2 caracteres).");
    }

    if (!email || !isValidEmail(email)) {
      errors.push("El campo 'email' es requerido y debe tener un formato válido.");
    }

    if (!phone || typeof phone !== "string" || phone.trim().length < 6) {
      errors.push("El campo 'phone' es requerido.");
    }

    if (!date) {
      errors.push("El campo 'date' de visita es requerido.");
    }

    const adventurerCount = parseInt(people || count || 1, 10);
    if (isNaN(adventurerCount) || adventurerCount < 1) {
      errors.push("El número de personas ('people' o 'count') debe ser al menos 1.");
    }

    if (errors.length > 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: "Error de validación en la solicitud.",
          errors,
        }),
      };
    }

    // 4. Construct Item for DynamoDB
    const uuid = randomUUID();
    const subscriptionCode = `SLV-${Math.floor(100000 + Math.random() * 900000)}`;
    const timestamp = new Date().toISOString();

    const item = {
      id: uuid,                                    // Primary Key fallback
      subscriptionId: subscriptionCode,            // Friendly code
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      visitDate: date,
      experience: String(experience).trim(),
      adventurers: adventurerCount,
      extraGuide: Boolean(guide),
      extraLunch: Boolean(lunch),
      notes: typeof notes === "string" ? notes.trim() : "",
      totalEstimatedPrice: totalPrice ? String(totalPrice) : null,
      status: "CONFIRMED",
      createdAt: timestamp,
      updatedAt: timestamp,
      source: "Landing Park Adventure",
    };

    // 5. Put Item into DynamoDB Table 'ParkAdventure'
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    });

    await docClient.send(command);
    console.log(`[DynamoDB] Reserva guardada exitosamente: ${subscriptionCode} - ${item.email}`);

    // 6. Return successful response (201 Created)
    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: "¡Reserva registrada con éxito en Park Adventure!",
        data: {
          id: item.id,
          subscriptionId: item.subscriptionId,
          name: item.name,
          email: item.email,
          phone: item.phone,
          visitDate: item.visitDate,
          experience: item.experience,
          adventurers: item.adventurers,
          status: item.status,
          createdAt: item.createdAt,
        },
      }),
    };
  } catch (error) {
    console.error("[DynamoDB Error] Error guardando reserva en DynamoDB:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        message: "Error interno del servidor al procesar la reserva.",
        error: error.message || "Internal Server Error",
      }),
    };
  }
};
