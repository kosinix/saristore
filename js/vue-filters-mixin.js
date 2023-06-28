window.vueFiltersMixin = {
    // Same-name data are overwritten
    filters: {
        money: function (value) {
            return parseFloat(_.toNumber(value).toFixed(2));
        },
        /**
         * Readable money format
         * 
         * @param {String|Number} value 
         * @param {String} sep 
         * @param {Number} decPlace 
         * 
         * @returns {String} Readable money format
         */
        currency: function (value, sep, decPlace) {
            return parseFloat(value).toFixed(2)
        },
    },
}