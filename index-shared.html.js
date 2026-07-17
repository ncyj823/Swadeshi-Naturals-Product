
    const API_BASE = "https://api.swadeshinatural.com";
    const CART_STORAGE_KEY = 'swadeshi_cart';
    const PRODUCTS_STORAGE_KEY = 'swadeshi_products';


    // CODEx: language and page interactions
    const LANGUAGE_KEY = 'swadeshi_language';
    let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || 'en';
    let currentProductFilter = 'all';
    let cachedProducts = [];

    const translations = {
      hi: {
        'Free delivery on orders above ₹499 | Use code NATURAL10 for 10% off your first order': '₹499 से ऊपर के ऑर्डर पर मुफ्त डिलीवरी | पहले ऑर्डर पर 10% छूट के लिए NATURAL10 कोड लगाएं',
        'Login': 'लॉगिन', 'Cart': 'कार्ट', 'Search': 'खोजें', 'Search for products...': 'उत्पाद खोजें...',
        'Cosmetics': 'कॉस्मेटिक्स', 'Pooja Items': 'पूजा सामग्री', 'Product': 'उत्पाद', 'Instant Breakfast Items': 'इंस्टेंट नाश्ता', 'Time Saving': 'समय बचत', 'Pickle, Jam & Chutney': 'अचार, जैम और चटनी', 'Home Care': 'होम केयर',
        '100% Natural & Organic': '100% प्राकृतिक और ऑर्गेनिक', 'Feel better, live fully with organic wellness': 'ऑर्गेनिक वेलनेस के साथ बेहतर महसूस करें',
        'Organic natural products carefully crafted to support your health, vitality and create lasting positive impact through nature.': 'आपके स्वास्थ्य और ऊर्जा के लिए प्रकृति से बने भरोसेमंद प्राकृतिक उत्पाद।',
        'Shop Now': 'अभी खरीदें', 'Top Categories': 'मुख्य श्रेणियां', 'Featured Products': 'विशेष उत्पाद', 'Best Sellers': 'सबसे ज्यादा बिकने वाले',
        'Upcoming Events You Shouldn\'t Miss': 'आने वाले कार्यक्रम', 'Resources': 'संसाधन', 'Customer Reviews': 'ग्राहक समीक्षा',
        'Cosmetic': 'कॉस्मेटिक', 'Ready to Eat': 'रेडी टू ईट', 'Medicine': 'औषधि', 'Pickle': 'अचार', 'Add to Cart': 'कार्ट में जोड़ें', 'Added! ✓': 'जुड़ गया! ✓',
        'View Cart': 'कार्ट देखें', 'Total Items:': 'कुल आइटम:', 'Cart is empty': 'कार्ट खाली है', 'Add some products to your cart': 'अपने कार्ट में कुछ उत्पाद जोड़ें', 'Subtotal': 'उप-योग', 'Proceed to Checkout →': 'चेकआउट करें →',
        'Complete Your Order': 'अपना ऑर्डर पूरा करें', 'Order Summary': 'ऑर्डर सारांश', 'Contact Details': 'संपर्क विवरण', 'Full Name': 'पूरा नाम', 'Mobile Number': 'मोबाइल नंबर', 'Email': 'ईमेल', 'Delivery Address': 'डिलीवरी पता', 'Order Notes': 'ऑर्डर नोट्स', 'Back': 'वापस', 'Place Order →': 'ऑर्डर करें →', 'Order Placed Successfully!': 'ऑर्डर सफलतापूर्वक हो गया!', 'Continue Shopping': 'खरीदारी जारी रखें'
      }
    };

    function t(text) {
      if (currentLanguage === 'en') return text;
      return translations.hi[text] || text;
    }

    function setText(selector, englishText) {
      document.querySelectorAll(selector).forEach(el => { el.textContent = t(englishText); });
    }

    function applyLanguage() {
      document.documentElement.lang = currentLanguage === 'hi' ? 'hi' : 'en';
      const toggle = document.getElementById('languageToggle');
      if (toggle) {
        toggle.textContent = currentLanguage === 'hi' ? 'EN' : 'हि';
        toggle.title = currentLanguage === 'hi' ? 'Switch to English' : 'हिंदी में बदलें';
      }
      setText('.topbar', 'Free delivery on orders above ₹499 | Use code NATURAL10 for 10% off your first order');
      const searchInput = document.querySelector('.search-bar input');
      if (searchInput) searchInput.placeholder = t('Search for products...');
      setText('.search-bar button', 'Search');
      const login = document.querySelector('.header-icons a[href="login.html"]');
      if (login) login.lastChild.textContent = ' ' + t('Login');
      updateHeaderCartLabel();
      const navLabels = ['☰', 'Cosmetics', 'Pooja Items', 'Product', 'Instant Breakfast Items', 'Time Saving', 'Pickle, Jam & Chutney', 'Home Care'];
      document.querySelectorAll('nav a').forEach((el, i) => { if (navLabels[i]) el.textContent = navLabels[i] === '☰' ? '☰' : t(navLabels[i]); });
      setText('.hero-eyebrow', '100% Natural & Organic');
      const h1 = document.querySelector('.hero h1');
      if (h1) h1.innerHTML = currentLanguage === 'hi' ? 'ऑर्गेनिक वेलनेस के साथ <em>बेहतर महसूस करें</em>' : 'Feel better, live fully with <em>organic wellness</em>';
      setText('.hero p', 'Organic natural products carefully crafted to support your health, vitality and create lasting positive impact through nature.');
      document.querySelectorAll('.btn-cta, .btn-green').forEach(el => { el.textContent = t('Shop Now'); });
      const sectionNames = ['Top Categories', 'Featured Products', 'Best Sellers', 'Upcoming Events You Shouldn\'t Miss', 'Resources', 'Customer Reviews'];
      document.querySelectorAll('.section-title').forEach((el, i) => { if (sectionNames[i]) el.textContent = t(sectionNames[i]); });
      document.querySelectorAll('.cat-label').forEach(el => { el.textContent = t(el.dataset.en || el.textContent.trim()); });
      document.querySelectorAll('.add-cart').forEach(btn => { if (!btn.classList.contains('is-added')) btn.textContent = t('Add to Cart'); });
      setText('#viewCartBtn', 'View Cart');
      const emptyTitle = document.querySelector('#cartEmpty h3'); if (emptyTitle) emptyTitle.textContent = t('Cart is empty');
      const emptyText = document.querySelector('#cartEmpty p'); if (emptyText) emptyText.textContent = t('Add some products to your cart');
    }

    function updateHeaderCartLabel() {
      const cartBtn = document.querySelector('.cart-btn');
      if (!cartBtn) return;
      const count = cartManager ? cartManager.getTotalItems() : 0;
      cartBtn.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3A1 1 0 006 17h12M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"/></svg>
      ${t('Cart')} (${count})
    `;
    }

    function categoryKey(label) {
      const value = String(label || '').toLowerCase();
      if (value.includes('cosmetic')) return 'cosmetic';
      if (value.includes('pooja')) return 'pooja';
      if (value.includes('breakfast')) return 'breakfast';
      if (value.includes('pickle') || value.includes('chutney') || value.includes('jam')) return 'pickle';
      if (value.includes('home')) return 'home';
      if (value.includes('ready')) return 'readytoeat';
      if (value.includes('medicine')) return 'medicine';
      return 'all';
    }

    function productMatchesFilter(product, filter) {
      if (!filter || filter === 'all') return true;
      const haystack = [product.title, product.subtitle, product.category].join(' ').toLowerCase();
      if (filter === 'pickle') return /pickle|jam|chutney|mango|sambar/.test(haystack);
      if (filter === 'home') return /home|care|clean|wash/.test(haystack);
      if (filter === 'medicine') return /medicine|herbal|health|wellness/.test(haystack);
      if (filter === 'pooja') return /pooja|puja|lamp|incense/.test(haystack);
      return haystack.includes(filter);
    }

    function applyProductFilter(filter, searchTerm = '') {
      currentProductFilter = filter || 'all';
      const term = searchTerm.trim().toLowerCase();
      const source = cachedProducts.length ? cachedProducts : [];
      const filtered = source.filter(product => productMatchesFilter(product, currentProductFilter))
        .filter(product => !term || [product.title, product.subtitle, product.category, product.description].join(' ').toLowerCase().includes(term));
      if (source.length) renderProducts(filtered.length ? filtered : source);
      document.querySelector('.featured-strip')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function initPageInteractions() {
      document.querySelectorAll('.cat-label').forEach(el => { el.dataset.en = el.textContent.trim(); });
      document.getElementById('languageToggle')?.addEventListener('click', () => {
        currentLanguage = currentLanguage === 'en' ? 'hi' : 'en';
        localStorage.setItem(LANGUAGE_KEY, currentLanguage);
        applyLanguage();
        if (cartManager) cartManager.renderUI();
      });
      document.querySelector('.search-bar button')?.addEventListener('click', () => applyProductFilter('all', document.querySelector('.search-bar input')?.value || ''));
      document.querySelector('.search-bar input')?.addEventListener('keydown', event => { if (event.key === 'Enter') applyProductFilter('all', event.currentTarget.value); });
      document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', event => {
          event.preventDefault();
          document.querySelectorAll('nav a').forEach(item => item.classList.remove('active'));
          link.classList.add('active');
          const label = link.textContent.trim();
          if (label === '☰' || label === t('Product')) return document.querySelector('.section')?.scrollIntoView({ behavior: 'smooth' });
          applyProductFilter(categoryKey(label));
        });
      });
      document.querySelectorAll('.cat-item').forEach(item => item.addEventListener('click', () => applyProductFilter(categoryKey(item.querySelector('.cat-label')?.dataset.en || item.textContent))));
      document.querySelectorAll('.btn-cta, .btn-green').forEach(btn => btn.addEventListener('click', event => { event.preventDefault(); document.querySelector('.featured-strip')?.scrollIntoView({ behavior: 'smooth' }); }));
      const rail = document.querySelector('.featured-rail');
      document.querySelectorAll('.featured-arrow').forEach((btn, index) => btn.addEventListener('click', () => rail?.scrollBy({ left: index === 0 ? -290 : 290, behavior: 'smooth' })));
      document.querySelectorAll('footer a[href="#"]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); applyProductFilter(categoryKey(link.textContent)); }));
      applyLanguage();
    }

    // ===== CART MANAGEMENT =====
    class CartManager {
      constructor() {
        this.cart = this.loadCart();
        this.init();
      }

      init() {
        this.setupEventListeners();
        this.renderUI();
      }

      loadCart() {
        try {
          return JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || {};
        } catch {
          return {};
        }
      }

      saveCart() {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.cart));
        this.renderUI();
      }

      addItem(product) {
        const id = product.id;
        if (this.cart[id]) {
          this.cart[id].quantity += 1;
        } else {
          this.cart[id] = {
            ...product,
            quantity: 1
          };
        }
        this.saveCart();
        this.showCartBar();
      }

      removeItem(id) {
        delete this.cart[id];
        this.saveCart();
      }

      updateQuantity(id, quantity) {
        if (quantity <= 0) {
          this.removeItem(id);
        } else {
          this.cart[id].quantity = quantity;
          this.saveCart();
        }
      }

      getTotal() {
        return Object.values(this.cart).reduce((sum, item) => sum + (item.price * item.quantity), 0);
      }

      getTotalItems() {
        return Object.values(this.cart).reduce((sum, item) => sum + item.quantity, 0);
      }

      getCartItems() {
        return Object.values(this.cart);
      }

      renderUI() {
        this.updateHeader();
        this.updateCartDrawer();
        this.updateCartBar();
      }

      updateHeader() {
        updateHeaderCartLabel();
      }

      updateCartDrawer() {
        const items = this.getCartItems();
        const cartItemsContainer = document.getElementById('cartItems');
        const cartEmpty = document.getElementById('cartEmpty');
        const cartFooter = document.getElementById('cartFooter');

        if (items.length === 0) {
          cartItemsContainer.innerHTML = '';
          cartEmpty.style.display = 'flex';
          cartFooter.style.display = 'none';
          return;
        }

        cartEmpty.style.display = 'none';
        cartFooter.style.display = 'block';

        cartItemsContainer.innerHTML = items.map(item => `
        <div class="drawer-item-row" style="display:flex;gap:12px;padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:12px;animation:slideInRow 0.3s ease forwards;">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" style="width:80px;height:80px;object-fit:cover;border-radius:6px;flex-shrink:0;background:var(--cream);" />
          <div style="flex:1;display:flex;flex-direction:column;">
            <div style="font-size:13px;font-weight:600;color:var(--brown-dark);margin-bottom:4px;">${escapeHtml(item.title)}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">₹${item.price.toFixed(2)}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:auto;">
              <button data-cart-id="${item.id}" data-action="decrease" style="width:28px;height:28px;background:var(--border);border:none;border-radius:4px;cursor:pointer;font-weight:600;color:var(--brown-dark);">−</button>
              <span style="min-width:30px;text-align:center;font-weight:600;color:var(--text-dark);">${item.quantity}</span>
              <button data-cart-id="${item.id}" data-action="increase" style="width:28px;height:28px;background:var(--border);border:none;border-radius:4px;cursor:pointer;font-weight:600;color:var(--brown-dark);">+</button>
              <button data-cart-id="${item.id}" data-action="remove" style="margin-left:auto;background:none;border:none;color:#e74c3c;cursor:pointer;font-size:16px;">🗑</button>
            </div>
          </div>
        </div>
      `).join('');

        document.getElementById('cartTotal').textContent = `₹${this.getTotal().toFixed(2)}`;
      }

      updateCartBar() {
        const total = this.getTotalItems();
        const cartBar = document.getElementById('cartBar');
        if (total === 0) {
          cartBar.classList.remove('visible');
          document.body.classList.remove('cart-active');
        } else {
          cartBar.classList.add('visible');
          document.body.classList.add('cart-active');
          document.getElementById('cartCount').textContent = total;
          document.getElementById('cartBarTotal').textContent = this.getTotal().toFixed(2);
        }
      }

      showCartBar() {
        document.getElementById('cartBar').classList.add('visible');
      }

      setupEventListeners() {
        // Open/Close cart drawer
        document.getElementById('viewCartBtn')?.addEventListener('click', () => this.openDrawer());
        document.getElementById('closeCartBtn')?.addEventListener('click', () => this.closeDrawer());
        document.getElementById('cartBackdrop')?.addEventListener('click', () => this.closeDrawer());

        // Cart drawer actions
        document.getElementById('cartItems')?.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-action]');
          if (!btn) return;
          const id = btn.dataset.cartId;
          const action = btn.dataset.action;
          const item = this.cart[id];
          if (!item) return;

          if (action === 'increase') {
            this.updateQuantity(id, item.quantity + 1);
          } else if (action === 'decrease') {
            this.updateQuantity(id, item.quantity - 1);
          } else if (action === 'remove') {
            this.removeItem(id);
          }
        });

        // Cart button in header
        document.querySelector('.cart-btn')?.addEventListener('click', (e) => {
          e.preventDefault();
          this.openDrawer();
        });
      }

      openDrawer() {
        const drawer = document.getElementById('cartDrawer');
        const backdrop = document.getElementById('cartBackdrop');
        drawer.style.right = '0';
        backdrop.classList.add('active');
      }

      closeDrawer() {
        const drawer = document.getElementById('cartDrawer');
        const backdrop = document.getElementById('cartBackdrop');
        drawer.style.right = '-400px';
        backdrop.classList.remove('active');
      }
    }

    // ===== UTILITY FUNCTIONS =====
    function normalizeImages(value) {
      if (Array.isArray(value)) {
        return value.map(item => String(item || '').trim()).filter(Boolean);
      }
      return String(value || '')
        .split(/\n|,/)
        .map(item => item.trim())
        .filter(Boolean);
    }

    function escapeHtml(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch];
      });
    }

    function starString(rating) {
      const filled = Math.max(1, Math.min(5, Math.round(Number(rating || 4.5))));
      return '★'.repeat(filled).padEnd(5, '☆');
    }

    function normalizeProduct(product) {
      const images = normalizeImages(product.images || product.image || product.image_url || '');
      const title = product.title || product.name || 'Product';
      return {
        id: product.id || title,
        title,
        subtitle: product.subtitle || product.telugu || product.category || product.catLabel || 'Natural product',
        category: product.category || product.catLabel || 'Natural products',
        price: Number(product.price || 0),
        oldPrice: Number(product.old_price || product.oldPrice || 0),
        discount: Number(product.discount || 0),
        delivery: product.delivery || '',
        description: product.description || '',
        image: images[0] || product.image_url || 'images/image-10.png',
        images,
        rating: Number(product.rating || 4.5),
        featured: product.featured !== false,
        active: product.active !== false
      };
    }

    function productCardHtml(product) {
      const oldPrice = product.oldPrice > product.price ? `<span class="price-old">₹${product.oldPrice}</span>` : '';
      const discount = product.discount > 0 ? `<span class="price-old" style="text-decoration:none;color:#7a5030;">${product.discount}% off</span>` : '';
      const delivery = product.delivery ? `<div class="prod-sub" style="margin-top:6px;">${escapeHtml(product.delivery)}</div>` : '';
      return `
      <div class="prod-card">
        <div class="prod-img"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" /></div>
        <div class="prod-info">
          <div class="prod-name">${escapeHtml(product.title)}</div>
          <div class="prod-sub">${escapeHtml(product.subtitle)}</div>
          <div class="stars">${starString(product.rating)}</div>
          <div class="prod-price"><span class="price-new">₹${product.price.toFixed(2)}</span>${oldPrice}${discount}</div>
          ${delivery}
          <button class="add-cart" data-product-id="${escapeHtml(product.id)}" data-product-title="${escapeHtml(product.title)}">${t('Add to Cart')}</button>
        </div>
      </div>
    `;
    }

    // Initialize cart manager
    let cartManager;

    function loadStoredProducts() {
      try {
        const stored = JSON.parse(localStorage.getItem(PRODUCTS_STORAGE_KEY) || '[]');
        return Array.isArray(stored) ? stored.map(normalizeProduct) : [];
      } catch (error) {
        console.warn('Stored products unavailable:', error);
        return [];
      }
    }

    async function loadProducts() {
      const sources = [
        async () => {
          if (window.location.protocol === 'file:') throw new Error('API unavailable from file view');
          const response = await fetch(API_BASE + '/api/products', { cache: 'no-store' });
          if (!response.ok) throw new Error('Failed to load API products');
          return await response.json();
        },
        async () => {
          const response = await fetch('data/db.json', { cache: 'no-store' });
          if (!response.ok) throw new Error('Failed to load local product data');
          const data = await response.json();
          return data.products || [];
        },
        async () => loadStoredProducts()
      ];

      for (const source of sources) {
        try {
          const products = (await source()).map(normalizeProduct).filter(product => product.active !== false);
          if (products.length) {
            cachedProducts = products;
            renderProducts(cachedProducts);
            return;
          }
        } catch (error) {
          console.warn('Product source unavailable:', error.message || error);
        }
      }

      // Keep the hand-coded cards visible if every dynamic source fails.
      cachedProducts = [];
    }

    function renderProducts(products) {
      const activeProducts = products.filter(product => product.active !== false);
      const featuredProducts = activeProducts.filter(product => product.featured).slice(0, 8);
      const bestSellerProducts = activeProducts;

      const featuredRow = document.querySelector('.featured-row');
      if (featuredRow) {
        featuredRow.innerHTML = (featuredProducts.length ? featuredProducts : activeProducts.slice(0, 4)).map(productCardHtml).join('');
      }

      const bestSellersGrid = document.querySelector('.prod-grid');
      if (bestSellersGrid) {
        bestSellersGrid.innerHTML = (bestSellerProducts.length ? bestSellerProducts : activeProducts.slice(0, 6)).map(productCardHtml).join('');
      }
    }

    window.addEventListener('DOMContentLoaded', function () {
      cartManager = new CartManager();
      initPageInteractions();
      loadProducts();

      // Add to cart button click handler
      document.addEventListener('click', function (event) {
        const button = event.target.closest('.add-cart');
        if (!button) return;

        const cardForTitle = button.closest('.prod-card');
        const productTitle = button.dataset.productTitle || cardForTitle?.querySelector('.prod-name')?.textContent?.trim() || 'Product';
        const productId = button.dataset.productId || productTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        // Find the product card to get full details
        const card = button.closest('.prod-card');
        const priceText = card.querySelector('.price-new')?.textContent || '₹0';
        const price = parseFloat(priceText.replace('₹', ''));
        const image = card.querySelector('.prod-img img')?.src || 'images/image-10.png';
        const subtitle = card.querySelector('.prod-sub')?.textContent || '';

        const product = {
          id: productId,
          title: productTitle,
          price: price,
          image: image,
          subtitle: subtitle
        };

        cartManager.addItem(product);

        // Show confirmation
        button.classList.add('is-added');
        button.textContent = t('Added! ✓');
        button.style.background = 'var(--green-cta)';
        setTimeout(() => {
          button.classList.remove('is-added');
          button.textContent = t('Add to Cart');
          button.style.background = '';
        }, 1500);
      });
    });
  </script>

  <!-- ══════════════════════════════════════
     CHECKOUT MODAL
══════════════════════════════════════ -->
  <div class="checkout-overlay" id="checkoutOverlay">
    <div class="checkout-modal" id="checkoutModal">

      <!-- Form View -->
      <div id="checkoutForm">
        <div class="checkout-header">
          <h3>Complete Your Order</h3>
          <button class="checkout-close" onclick="closeCheckout()">✕</button>
        </div>

        <div class="checkout-body">
          <!-- Order Summary -->
          <div class="checkout-order-summary">
            <div class="summary-title">🛒 Order Summary</div>
            <div id="checkoutSummaryItems"></div>
            <div class="summary-total">
              <span>Total</span>
              <span id="checkoutSummaryTotal">₹0.00</span>
            </div>
          </div>

          <!-- Customer Details -->
          <div class="co-field-row">
            <div class="co-field">
              <label>Full Name *</label>
              <input type="text" id="co-name" placeholder="Your full name" />
            </div>
            <div class="co-field">
              <label>Phone Number *</label>
              <input type="tel" id="co-phone" placeholder="10-digit mobile number" />
            </div>
          </div>
          <div class="co-field">
            <label>Email Address</label>
            <input type="email" id="co-email" placeholder="Optional — for order confirmation" />
          </div>
          <div class="co-field">
            <label>Delivery Address *</label>
            <textarea id="co-address" placeholder="House/Flat No, Street, Area, City, Pincode"></textarea>
          </div>
          <div class="co-field">
            <label>Special Instructions</label>
            <input type="text" id="co-notes" placeholder="Optional — any special instructions" />
          </div>
        </div>

        <div class="checkout-footer">
          <button class="btn-back-cart" onclick="closeCheckout()">← Back</button>
          <button class="btn-place-order" id="placeOrderBtn" onclick="placeOrder()">
            Place Order →
          </button>
        </div>
      </div>

      <!-- Success View (hidden initially) -->
      <div id="checkoutSuccess" style="display:none;">
        <div class="checkout-success">
          <div class="success-icon">🎉</div>
          <h3>Order Placed Successfully!</h3>
          <p>Thank you for shopping with Swadeshi Natural Products.</p>
          <p>We'll contact you shortly to confirm your order.</p>
          <div class="order-id-badge" id="successOrderId"></div>
          <p style="font-size:12px;color:var(--text-muted);">
            📞 Office Timing: 9:00 AM – 8:00 PM<br>
            🚚 Free delivery on orders above ₹499
          </p>
          <button class="btn-continue-shopping" onclick="finishCheckout()">
            Continue Shopping
          </button>
        </div>
      </div>

    </div>
  </div>

  <script>
    // ══════════════════════════════════════
    // SUPABASE CONNECTION
    // ══════════════════════════════════════
    const SUPABASE_URL = "PASTE_YOUR_PROJECT_URL_HERE";
    const SUPABASE_ANON_KEY = "PASTE_YOUR_ANON_PUBLIC_KEY_HERE";
    const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ══════════════════════════════════════
    // CHECKOUT FUNCTIONS
    // ══════════════════════════════════════
    function openCheckout() {
      const items = cartManager.getCartItems();
      if (!items.length) return;

      // Populate summary
      document.getElementById('checkoutSummaryItems').innerHTML = items.map(item => `
    <div class="summary-item">
      <span>${escapeHtml(item.title)} × ${item.quantity}</span>
      <span>₹${(item.price * item.quantity).toFixed(2)}</span>
    </div>
  `).join('');
      document.getElementById('checkoutSummaryTotal').textContent = `₹${cartManager.getTotal().toFixed(2)}`;

      // Reset form
      document.getElementById('checkoutForm').style.display = 'block';
      document.getElementById('checkoutSuccess').style.display = 'none';
      ['co-name', 'co-phone', 'co-email', 'co-address', 'co-notes'].forEach(id => {
        document.getElementById(id).value = '';
      });

      // Show overlay
      document.getElementById('checkoutOverlay').classList.add('open');
      cartManager.closeDrawer();
    }

    function closeCheckout() {
      document.getElementById('checkoutOverlay').classList.remove('open');
    }

    // Close on backdrop click
    document.getElementById('checkoutOverlay').addEventListener('click', function (e) {
      if (e.target === this) closeCheckout();
    });


    // Preload Razorpay on page load
    let isRazorpayLoading = false;
    function preloadRazorpay() {
      if (window.Razorpay || isRazorpayLoading) return;
      isRazorpayLoading = true;
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => console.log('Razorpay loaded early');
      document.body.appendChild(script);
    }
    window.addEventListener('DOMContentLoaded', preloadRazorpay);

    async function placeOrder() {
      console.log('1. Pay Now clicked, starting validation');
      
      const btn = document.getElementById('placeOrderBtn');
      
      if (!window.Razorpay) {
        alert("Payment gateway is still loading. Please wait a second and try again.");
        return;
      }
      const name = document.getElementById('co-name').value.trim();
      const phone = document.getElementById('co-phone').value.trim();
      const email = document.getElementById('co-email').value.trim();
      const address = document.getElementById('co-address').value.trim();
      const notes = document.getElementById('co-notes').value.trim();

      // Validation
      if (!name) { alert('Please enter your full name.'); document.getElementById('co-name').focus(); return; }
      if (!phone || phone.length < 10) { alert('Please enter a valid 10-digit phone number.'); document.getElementById('co-phone').focus(); return; }
      if (!address) { alert('Please enter your delivery address.'); document.getElementById('co-address').focus(); return; }

      const items = cartManager.getCartItems();
      const total = cartManager.getTotal();
      if (!items.length) { alert('Your cart is empty.'); return; }

      const btn = document.getElementById('placeOrderBtn');
      btn.disabled = true;
      btn.textContent = 'Starting Payment...';

      try {
        console.log('2. Requesting order creation from backend');
        
        // Setup timeout for fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout

        // 1. Ask our backend to create a Razorpay order for this amount
        const payRes = await fetch(API_BASE + '/api/payment/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: total }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const payData = await payRes.json();
        console.log('3. Backend response received:', payData);
        
        if (!payRes.ok || !payData.id) {
          throw new Error(payData.error || 'Could not start payment. Please try again.');
        }

        console.log('4. Initializing Razorpay checkout modal');
        // 2. Open the Razorpay payment popup
        const rzp = new Razorpay({
          key: RAZORPAY_KEY_ID,
          amount: payData.amount,
          currency: payData.currency || 'INR',
          name: 'Swadeshi Natural Products',
          description: 'Order payment',
          order_id: payData.id,
          prefill: { name: name, email: email, contact: phone },
          theme: { color: '#6b7a3f' },
          handler: async function (response) {
            console.log('5. Payment succeeded, verifying & saving to backend');
            // 3. Payment succeeded — now save the order in our database
            btn.textContent = 'Saving Order...';
            try {
              const itemDetails = items.map(function (item) {
                return { id: item.id, name: item.title, quantity: item.quantity, price: item.price };
              });

              const orderRes = await fetch(API_BASE + '/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  customer: name,
                  customerPhone: phone,
                  customerEmail: email,
                  address: address,
                  notes: (notes ? notes + ' | ' : '') + 'razorpay_payment_id: ' + response.razorpay_payment_id,
                  itemDetails: itemDetails,
                  amount: total,
                  paymentStatus: 'Completed',
                  status: 'Paid'
                })
              });
              const orderData = await orderRes.json();
              if (!orderRes.ok || !orderData.ok) {
                throw new Error('Payment succeeded but saving the order failed. Please contact us with your payment ID: ' + response.razorpay_payment_id);
              }

              console.log('6. Order saved successfully');
              const orderId = orderData.order && orderData.order.id ? orderData.order.id : '';
              document.getElementById('successOrderId').textContent = orderId ? `Order ID: ${orderId}` : 'Order placed successfully.';
              document.getElementById('checkoutForm').style.display = 'none';
              document.getElementById('checkoutSuccess').style.display = 'block';

              // Clear cart
              cartManager.cart = {};
              cartManager.saveCart();
            } catch (saveErr) {
              console.error('Order save failed:', saveErr);
              alert(saveErr.message);
              btn.disabled = false;
              btn.textContent = 'Place Order →';
            }
          },
          modal: {
            ondismiss: function () {
              console.log('Razorpay modal dismissed by user');
            }
          }
        });

        rzp.on('payment.failed', function (response) {
          console.error('Payment failed:', response.error);
          alert('Payment failed: ' + response.error.description);
        });

        rzp.open();

      } catch (err) {
        console.error('Order failed:', err);
        
        let errorMsg = 'Something went wrong. Please try again or call us directly.';
        if (err.name === 'AbortError') {
          errorMsg = 'Payment request timed out. Please check your internet connection and try again.';
        } else if (err.message && err.message.includes('Failed to fetch')) {
          errorMsg = 'Network error. Please check your connection and try again.';
        } else if (err.message) {
          errorMsg = err.message;
        }
        
        alert(errorMsg);
      } finally {
        btn.disabled = false;
        if (btn.textContent === 'Starting Payment...') {
          btn.textContent = 'Place Order →';
        }
      }
    }

    function finishCheckout() {
      closeCheckout();
    }
  