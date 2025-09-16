(function () {
  const g = (typeof window !== 'undefined') ? window : globalThis;

  g.bt = {
    _instance: null,
    _canRequest: false,


    initDropin: function (containerId, clientToken, options) {
      if (!clientToken) return Promise.reject(new Error('clientToken is required'));
      const container = document.getElementById(containerId || 'dropin-container');
      if (!container) return Promise.reject(new Error('container not found'));

      if (g.bt._instance) {
        return g.bt.teardown();
      }

      const applePayEnabled = !!(options && options.applePay);
      const applePayCfg = applePayEnabled ? {
        displayName: options.applePay.displayName || 'Your Shop',

        paymentRequest: {
          total: {
            label: options.applePay.totalLabel || 'Total',
            amount: options.applePay.amount || '4.99'
          }
        }
      } : null;

      const createOpts = {
        authorization: clientToken,
        container: container,
        dataCollector: true,
//        paymentOptionPriority: ['applePay', 'card'],
        applePay: applePayCfg || undefined,
        paypal: (options && options.paypal) || undefined,
        googlePay: (options && options.googlePay) || undefined,
      };


      if (options && options.extraOptions) {
        Object.assign(createOpts, options.extraOptions);
      }

      return braintree.dropin.create(createOpts).then(function (instance) {
        g.bt._instance = instance;
          g.bt._canRequest = instance.isPaymentMethodRequestable();
          instance.on('paymentMethodRequestable', function () { g.bt._canRequest = true; });
          instance.on('noPaymentMethodRequestable', function () { g.bt._canRequest = false; });
      });
    },

    canRequestPaymentMethod: function () { return !!g.bt._canRequest; },

    requestPaymentMethod: function (opts) {
      if (!g.bt._instance) return Promise.reject(new Error('Drop-in is not initialized'));
      return g.bt._instance.requestPaymentMethod(opts || {}).then(function (payload) {
        return {
          nonce: payload.nonce,
          type: payload.type || null,
          details: payload.details || null

        };
      });
    },


    /*getDeviceData: function () {
      if (!g.bt._instance) return null;
      const dc = g.bt._instance._mainView && g.bt._instance._mainView.model && g.bt._instance._mainView.model._client;
      return null;
    },*/

    teardown: function () {
      if (!g.bt._instance) return Promise.resolve();
      const i = g.bt._instance; g.bt._instance = null; g.bt._canRequest = false;
      return i.teardown();
    }
  };
})();
