(function () {
  const g = (typeof window !== 'undefined') ? window : globalThis;

  g.bt = {
    _instance: null,

    // Инициализация Drop-in
    // options.extraOptions можно передавать из Dart для кастомизации
    initDropin: function (containerId, clientToken, options) {
      if (!clientToken) return Promise.reject(new Error('clientToken is required'));
      const container = document.getElementById(containerId || 'dropin-container');
      if (!container) return Promise.reject(new Error('container not found'));

      if (g.bt._instance) {
        return g.bt.teardown();
      }

      const applePayEnabled = !!(options && options.applePay);
      const applePayCfg = applePayEnabled ? {
        // displayName будет подписью в шите Apple Pay
        displayName: options.applePay.displayName || 'Your Shop',
        // ВАЖНО: total обязателен. Валюта тянется из мерчанта/токена.
        paymentRequest: {
          total: {
            label: options.applePay.totalLabel || 'Total',
            amount: options.applePay.amount || '4.99'
          }
          // при необходимости можно добавить прочие ApplePayPaymentRequest поля
        }
      } : null;

      const createOpts = {
        authorization: clientToken,
        container: container,
        // включим сбор deviceData для фрода (если включён в панели)
        dataCollector: true,
        // порядок вкладок можно настроить: ['applePay','card', 'paypal', ...]
        paymentOptionPriority: ['applePay', 'card'],
        // Apple Pay — только если включён и поддерживается браузером
        applePay: applePayCfg || undefined,
        // карты (hosted fields внутри drop-in идут по умолчанию)
        // другие методы (paypal/googlePay/venmo) можно добавить здесь
      };

      // позволяeм переопределить любые поля через options.extraOptions
      if (options && options.extraOptions) {
        Object.assign(createOpts, options.extraOptions);
      }

      return braintree.dropin.create(createOpts).then(function (instance) {
        g.bt._instance = instance;
      });
    },

    // Получить payment method (nonce + тип)
    requestPaymentMethod: function () {
      if (!g.bt._instance) return Promise.reject(new Error('Drop-in is not initialized'));
      return g.bt._instance.requestPaymentMethod().then(function (payload) {
        // payload.nonce — отправляем на сервер для sale/auth/verify
        return {
          nonce: payload.nonce,
          type: payload.type || null,
          details: payload.details || null
          // deviceData собирается отдельно; drop-in положит в dataCollector
        };
      });
    },

    // Получить deviceData (если dataCollector: true)
    getDeviceData: function () {
      if (!g.bt._instance) return null;
      const dc = g.bt._instance._mainView && g.bt._instance._mainView.model && g.bt._instance._mainView.model._client;
      // У drop-in нет официального геттера, поэтому deviceData обычно возвращают вместе с серверным ответом;
      // при необходимости можно собирать через отдельный braintree-web/data-collector.
      return null;
    },

    teardown: function () {
      if (!g.bt._instance) return Promise.resolve();
      const i = g.bt._instance; g.bt._instance = null;
      return i.teardown();
    }
  };
})();
