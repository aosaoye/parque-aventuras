/**
 * Silva - Parque de Aventuras
 * Main Application Logic (Vanilla JS)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 2. Mobile Menu Toggle
  const mobileMenuBtn = document.getElementById('btn-mobile-menu');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  // Close mobile menu when clicking any nav link
  document.querySelectorAll('#mobile-menu a').forEach(link => {
    link.addEventListener('click', () => {
      if (mobileMenu) mobileMenu.classList.add('hidden');
    });
  });

  // 3. Set Default Date in Booking Form (Tomorrow)
  const dateInput = document.getElementById('booking-date');
  if (dateInput) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    
    dateInput.min = `${yyyy}-${mm}-${dd}`;
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  // 4. Booking Price Calculation
  const PRICES = {
    'tirolina': { name: 'Circuito Tirolinas & Copas', basePrice: 28 },
    'puente': { name: 'Puente Tibetano & Vía Ferrata', basePrice: 24 },
    'ciervo': { name: 'Eco-Safari & Ruta Fauna', basePrice: 18 },
    'campamento': { name: 'Pack Aventura Total (Todo Incluido)', basePrice: 38 }
  };

  const experienceSelect = document.getElementById('booking-experience');
  const countInput = document.getElementById('booking-count');
  const btnCountMinus = document.getElementById('btn-count-minus');
  const btnCountPlus = document.getElementById('btn-count-plus');
  const checkGuide = document.getElementById('booking-guide');
  const checkLunch = document.getElementById('booking-lunch');
  const priceDisplay = document.getElementById('booking-total-price');
  const summaryPlanDisplay = document.getElementById('booking-summary-plan');

  let explorerCount = 2;

  function updatePrice() {
    const selectedExp = experienceSelect ? experienceSelect.value : 'campamento';
    const expData = PRICES[selectedExp] || PRICES['campamento'];
    
    let unitPrice = expData.basePrice;
    let extraGuide = (checkGuide && checkGuide.checked) ? 15 : 0; // Flat guide supplement
    let extraLunchPerPerson = (checkLunch && checkLunch.checked) ? 9 : 0; // 9€ per person

    let subtotal = (unitPrice + extraLunchPerPerson) * explorerCount + extraGuide;

    if (priceDisplay) {
      priceDisplay.textContent = `${subtotal}€`;
    }
    if (summaryPlanDisplay) {
      summaryPlanDisplay.textContent = `${expData.name} × ${explorerCount} pers.`;
    }
  }

  if (btnCountMinus && countInput) {
    btnCountMinus.addEventListener('click', () => {
      if (explorerCount > 1) {
        explorerCount--;
        countInput.value = explorerCount;
        updatePrice();
      }
    });
  }

  if (btnCountPlus && countInput) {
    btnCountPlus.addEventListener('click', () => {
      if (explorerCount < 20) {
        explorerCount++;
        countInput.value = explorerCount;
        updatePrice();
      }
    });
  }

  if (experienceSelect) experienceSelect.addEventListener('change', updatePrice);
  if (checkGuide) checkGuide.addEventListener('change', updatePrice);
  if (checkLunch) checkLunch.addEventListener('change', updatePrice);

  // Initial calculation
  updatePrice();

  // 5. Booking Form Submission & API Gateway Integration
  const API_ENDPOINT = 'https://etocy4tz5f.execute-api.us-east-1.amazonaws.com/dev/subcriptions';
  const bookingForm = document.getElementById('booking-form');
  const modal = document.getElementById('confirmation-modal');
  const closeModalBtn = document.getElementById('btn-close-modal');
  const downloadTicketBtn = document.getElementById('btn-download-ticket');

  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';

      const name = document.getElementById('booking-name').value;
      const email = document.getElementById('booking-email').value;
      const phone = document.getElementById('booking-phone').value;
      const date = document.getElementById('booking-date').value;
      const selectedExp = experienceSelect.value;
      const expData = PRICES[selectedExp] || PRICES['campamento'];
      const totalEstimated = priceDisplay ? priceDisplay.textContent : '';

      // Prepare payload for Lambda & DynamoDB
      const payload = {
        name,
        email,
        phone,
        date,
        experience: selectedExp,
        people: explorerCount,
        count: explorerCount,
        guide: checkGuide ? checkGuide.checked : false,
        lunch: checkLunch ? checkLunch.checked : false,
        totalPrice: totalEstimated
      };

      // Loading state on button
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-forest-950 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>Conectando con Park Adventure...</span>
        `;
      }

      let generatedCode = 'SLV-' + Math.floor(100000 + Math.random() * 900000);

      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          if (result && result.data && result.data.subscriptionId) {
            generatedCode = result.data.subscriptionId;
          }
        } else {
          console.warn('API Gateway returned status:', response.status);
        }
      } catch (err) {
        console.warn('Could not reach API Gateway (network/CORS). Using offline confirmation code:', err);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHTML;
          if (window.lucide) window.lucide.createIcons();
        }
      }

      // Populate confirmation ticket
      document.getElementById('ticket-code').textContent = generatedCode;
      document.getElementById('ticket-name').textContent = name;
      document.getElementById('ticket-email').textContent = email;
      document.getElementById('ticket-phone').textContent = phone;
      document.getElementById('ticket-date').textContent = new Date(date).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      document.getElementById('ticket-activity').textContent = expData.name;
      document.getElementById('ticket-people').textContent = `${explorerCount} ${explorerCount === 1 ? 'persona' : 'personas'}`;
      document.getElementById('ticket-total').textContent = totalEstimated;

      // Show modal
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  if (closeModalBtn && modal) {
    closeModalBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      bookingForm.reset();
      explorerCount = 2;
      if (countInput) countInput.value = 2;
      updatePrice();
    });
  }

  if (downloadTicketBtn) {
    downloadTicketBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // 6. Quick Select Plan buttons from Pricing & Hotspot cards
  document.querySelectorAll('[data-select-plan]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const plan = btn.getAttribute('data-select-plan');
      if (experienceSelect) {
        experienceSelect.value = plan;
        updatePrice();
      }
      const reservaSec = document.getElementById('reserva-section');
      if (reservaSec) {
        reservaSec.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // 7. Activity Filtering (Tabs)
  const filterBtns = document.querySelectorAll('[data-filter]');
  const activityCards = document.querySelectorAll('[data-category]');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-filter');

      // Update button active state
      filterBtns.forEach(b => {
        b.classList.remove('bg-emerald-600', 'text-white', 'shadow-md');
        b.classList.add('bg-white', 'text-slate-600');
      });
      btn.classList.remove('bg-white', 'text-slate-600');
      btn.classList.add('bg-emerald-600', 'text-white', 'shadow-md');

      // Filter cards
      activityCards.forEach(card => {
        const itemCat = card.getAttribute('data-category');
        if (cat === 'all' || itemCat === cat) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });

  // 8. Close Hotspot detail card
  const closeHotspotBtn = document.getElementById('btn-close-hotspot');
  if (closeHotspotBtn && window.AdventureScene) {
    closeHotspotBtn.addEventListener('click', () => {
      window.AdventureScene.hideHotspotModal();
    });
  }

  // 9. FAQ Accordion
  document.querySelectorAll('.faq-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const content = btn.nextElementSibling;
      const icon = btn.querySelector('.faq-icon');
      
      content.classList.toggle('hidden');
      if (icon) {
        icon.classList.toggle('rotate-180');
      }
    });
  });
});
