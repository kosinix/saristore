
const db = new Dexie("SariStore")
db.version(1).stores({
    items: '++id, barcode, name, price, stock, size, unit, description'
});
db.open().catch(function (e) {
    console.error("Open failed: " + e.stack);
})

function resizeDimensions(width, height, newWidth, newHeight) {
    let ratio = width / height

    // Try basing it on width first
    let resizeWidth = newWidth;
    let resizeHeight = Math.round(newWidth / ratio);

    if ((resizeWidth < newWidth) || (resizeHeight < newHeight)) { // Oops, either width or height does not fit
        // So base on height instead
        resizeHeight = newHeight;
        resizeWidth = newHeight * ratio;
    }
    return {
        resizeWidth: Math.round(resizeWidth),
        resizeHeight: Math.round(resizeHeight),
    }
}

let vApp = undefined
var config = {
    inputStream: {
        type: "LiveStream",
        constraints: {
            width: { min: 320 },
            height: { min: 240 },
            aspectRatio: { min: 1, max: 100 },
            facingMode: "environment" // or user
        },
        target: document.querySelector('#interactive'),
    },
    locator: {
        patchSize: "medium",
        halfSample: true
    },
    numOfWorkers: 2,
    frequency: 10,
    decoder: {
        readers: [
            {
                format: "ean_reader",
                config: {}
            },
            {
                format: "ean_8_reader",
                config: {}
            }
        ]
    },
    locate: true
}

Quagga.onProcessed(function (result) {
    var drawingCtx = Quagga.canvas.ctx.overlay,
        drawingCanvas = Quagga.canvas.dom.overlay;

    if (result) {
        if (result.boxes) {
            drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
            result.boxes.filter(function (box) {
                return box !== result.box;
            }).forEach(function (box) {
                Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "green", lineWidth: 2 });
            });
        }

        if (result.box) {
            Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "#00F", lineWidth: 2 });
        }

        if (result.codeResult && result.codeResult.code) {
            Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, drawingCtx, { color: 'red', lineWidth: 3 });
        }
    }
});

var candidates = {}
var threshold = 3
Quagga.onDetected(function (result) {
    var code = result.codeResult.code;
    code = code + ''
    if (candidates[code]) {
        if (candidates[code] >= threshold) {
            // Send to vue
            let [path1, path2] = vApp.barcodeRecipient.split('.')
            if (path1 && path2) {
                vApp[path1][path2] = code
            } else if (path1) {
                vApp[path1] = code
            }

            //
            Quagga.stop()

            var drawingCtx = Quagga.canvas.ctx.overlay
            var drawingCanvas = Quagga.canvas.dom.overlay;

            if (result) {
                if (result.boxes) {
                    drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));

                }
            }
            jQuery('#modal-scan').modal('hide')
        } else {
            candidates[code]++

        }
    } else {
        candidates[code] = 1
    }
    // console.log(candidates)
});

$('#modal-scan').on('hide.bs.modal', function (e) {
    if (Quagga) {
        $('#interactive').html('')
        Quagga.stop();
    }
})
function changeCam() {
    if (Quagga) {
        $('#interactive').html('')
        Quagga.stop();
    }
    if (config.inputStream.constraints.facingMode === 'user') {
        config.inputStream.constraints.facingMode = 'environment'
    } else {
        config.inputStream.constraints.facingMode = 'user'

    }
    Quagga.init(config, function (err) {
        if (err) {
            console.error(err);
            alert(err.message)
            return;
        }
        Quagga.start();
    });
}
let timerSearchTimeout = null
vApp = new Vue({
    el: '#vApp',
    delimiters: ["${", "}"],
    mixins: [
        window.vueFiltersMixin,
    ],
    data: {
        page: '#home',
        pending: false,
        error: '',
        barcodeRecipient: 'newItem.barcode',
        newItem: {
            barcode: '',
            name: '',
            cost: 0,
            price: 0,
            stock: 0,
            size: '',
            unit: '',
            description: '',
            photo: '',
        },
        editedItem: {
            index: '',
            id: '',
            barcode: '',
            name: '',
            cost: 0,
            price: 0,
            stock: 0,
            size: '',
            unit: '',
            description: '',
            photo: '',
        },
        searchQuery: '',
        searchResults: [],
        cart: [],
        items: [],
        calculator: {
            x1: null,
            display: '',
            op: ''
        },
        lists: {
            units: [
                {
                    value: 'milligram',
                    name: 'Milligrams'
                },
                
                {
                    value: 'gram',
                    name: 'Grams'
                },
                {
                    value: 'kilogram',
                    name: 'Kilos'
                },
                {
                    value: 'liter',
                    name: 'Liters'
                },
                {
                    value: 'ounce',
                    name: 'Ounces'
                }
            ]
        }
    },
    watch: {
        page: function (newPage, oldPage) {
            const me = this;
            if (newPage === '#' || newPage === '') {
                me.page = '#home'
            }
            if (newPage === '#editItem') {
                if (me.editedItem.index === '' || me.editedItem.index === null || me.editedItem.index === undefined) {
                    window.location.hash = '#items'
                }
            }
        },
        searchQuery: function (newVal, oldVal) {
            const me = this;
            if (newVal !== oldVal) {
                me.onSearchQueryChange()
            }
        },
    },
    mounted: function () {
        const me = this
        db.items.toArray().then((items) => {
            me.items = items || []
        }).catch((err) => {
            console.error(err)
        })

        // TODO: change to home
        me.page = window.location.hash || '#home'
    },
    computed: {
        cartCount: function () {
            const me = this;

            return me.cart.reduce((a, b) => {
                let qty = (!b.qty) ? 0 : parseInt(b.qty)

                return a + qty
            }, 0)
        },
        cartTotal: function () {
            const me = this;

            return me.cart.reduce((a, b) => {
                let price = (!b.price) ? 0.0 : parseFloat(b.price)
                let qty = (!b.qty) ? 0 : parseInt(b.qty)

                return a + price * qty
            }, 0.0)
        }
    },
    methods: {
        calc: function (val, op) {
            const me = this;

            if (!me.calculator.x1) {
                me.calculator.x1 = parseFloat(val)
                me.calculator.display = ''
                me.calculator.op = op
            }
        },
        calcOp: function (val) {
            const me = this;

            if (me.calculator.op === '+') {
                me.calculator.display = me.calculator.x1 + parseFloat(val)
            } else if (me.calculator.op === '-') {
                me.calculator.display = me.calculator.x1 - parseFloat(val)
            } else if (me.calculator.op === 'x') {
                me.calculator.display = me.calculator.x1 * parseFloat(val)
            }
        },
        calcClear: function () {
            const me = this;
            me.calculator.x1 = null
            me.calculator.op = ''
            me.calculator.display = ''
        },
        addToCart: function (id) {
            const me = this;

            let existing = me.cart.findIndex(o => {
                return o.id === id
            })

            if (existing !== -1) {
                me.cart[existing].qty++
            } else {
                db.items.get(id).then((item) => {
                    // console.log(items)
                    me.cart.push({
                        id: item.id,
                        name: item.name,
                        photo: item.photo,
                        price: item.price,
                        qty: 1,
                    })
                }).catch((err) => {
                    console.error(err)
                })
            }
        },
        deleteCartItem: function (index) {
            const me = this
            me.$delete(me.cart, index)
        },
        onSearchQueryChange: function () {
            const me = this;
            if (!timerSearchTimeout) {
                timerSearchTimeout = setTimeout(function () {
                    me.search(me.searchQuery)
                    clearTimeout(timerSearchTimeout)
                    timerSearchTimeout = null
                }, 1000)
            }
        },
        search: function (s) {
            const me = this;

            if (!s) return

            if (!isNaN(s.slice(0, 6))) {
                db.items.where('barcode').startsWithAnyOfIgnoreCase(s).limit(10).toArray().then((items) => {
                    // console.log(items)
                    me.searchResults = items
                }).catch((err) => {
                    console.error(err)
                })
            } else {
                db.items.where('name').startsWithAnyOfIgnoreCase(s).limit(10).toArray().then((items) => {
                    // console.log(items)
                    me.searchResults = items
                }).catch((err) => {
                    console.error(err)
                })
            }
        },
        clear: function (group) {
            for (let name in this[group]) {
                this[group][name] = ''
            }
        },
        openTab: function (data) {
            let w = window.open('about:blank');
            let image = new Image();
            image.src = data;
            setTimeout(function () {
                w.document.write(image.outerHTML);
            }, 0);
        },
        onBarcode: function (barcodeRecipient) {
            const me = this
            Quagga.init(config, function (err) {
                if (err) {
                    console.error(err);
                    alert(err.message)
                    return;
                }
                Quagga.start();
                me.barcodeRecipient = barcodeRecipient
                jQuery('#modal-scan').modal('show')
            });
        },
        readFile: function (event, propPath, lodash, accept) {
            const me = this;
            let files = [];
            if ('target' in event) {
                if ('files' in event.target) {
                    files = event.target.files
                }
            }
            if (files) {
                let count = files.length;
                lodash.set(me, propPath, '')

                if (count > 1) {
                    // Remove all FileList content
                    event.target.value = "";
                    return alert('Maximum of 1 file only');
                }

                for (let i = 0; i < count; i++) {
                    if (accept.indexOf(files.item(i).type) === -1) {
                        // Remove all FileList content
                        event.target.value = "";

                        return alert('File type not allowed. Must be one of the following: ' + accept.join(', '));
                    }
                }

                for (let i = 0; i < count; i++) {
                    let file = files.item(i);
                    let reader = new FileReader();
                    reader.onload = function (e) {
                        try {
                            let base64Data = lodash.get(e, 'target.result', '')
                            let mime = base64Data.split(';')[0].replace('data:', '')
                            if (!mime) throw new Error('Not a valid photo.')
                            if (['image/jpeg', 'image/png'].includes(mime)) {
                                lodash.set(me, propPath, base64Data) // data URL base64 encoded
                            } else {
                                throw new Error('File type not allowed.')
                            }
                        } catch (err) {
                            console.error(err)
                            alert('Error: ' + err.message)
                        }
                    }
                    reader.readAsDataURL(file);
                }
            }
        },
        deleteItem: function (index) {
            const me = this
            db.items.delete(me.items[index].id).then(() => {
                me.$delete(me.items, index)

            }).catch(err => {
                console.error(err)
            })
        },
        editItem: function (index) {
            const me = this
            let item = me.items[index]
            me.editedItem = item
            me.editedItem.index = index
            window.location.hash = '#editItem'
        },
        onPostAddItem: function () {
            const me = this;

            // Error check
            let errors = []
            if (!me.newItem.name) {
                errors.push('Required name.')
            }
            if (!me.newItem.cost) {
                errors.push('Required cost')
            }
            if (!me.newItem.price) {
                errors.push('Required price')
            }
            if (!me.newItem.stock) {
                errors.push('Required stock')
            }
            if (errors.length > 0) {
                alert('Please correct the errors:' + `${"\n    "}${errors.join("\n    ")}`)
                return false
            }

            me.$nextTick(function () {
                let newItem = JSON.parse(JSON.stringify(me.newItem))
                me.items.push(newItem)
                db.items.add(newItem).then(() => {
                    me.clear('newItem')
                    window.location.hash = '#items'
                }).catch(err => {
                    console.error(err)
                })
            });
        },
        onPostEditItem: function (index) {
            const me = this;

            // Error check
            let errors = []
            if (!me.editedItem.name) {
                errors.push('Required name.')
            }
            if (!me.editedItem.cost) {
                errors.push('Required cost')
            }
            if (!me.editedItem.price) {
                errors.push('Required price')
            }
            if (!me.editedItem.stock) {
                errors.push('Required stock')
            }
            if (errors.length > 0) {
                alert('Please correct the errors:' + `${"\n    "}${errors.join("\n    ")}`)
                return false
            }

            me.$nextTick(function () {

                let editedItem = JSON.parse(JSON.stringify(me.editedItem))
                me.$set(me.items, editedItem.index, editedItem)

                delete editedItem.index

                db.items.update(me.editedItem.id, editedItem).then(function (updated) {
                    if (updated) {
                        console.log('updated')
                    } else {

                    }
                    me.clear('newItem')
                    me.page = '#items'
                });
            });
        },
        onPostSearchItem: function () {
            const me = this;

            me.onSearchQueryChange()
        }
    }
});

window.addEventListener("hashchange", function (event) {
    var currentPath = window.location.hash
    if (vApp.page !== currentPath) {
        vApp.page = currentPath
    }
}, false)


// window.addEventListener('beforeunload', function (e) {
//     var myPageIsDirty = true; //you implement this logic...
//     if (myPageIsDirty) {
//         //following two lines will cause the browser to ask the user if they
//         //want to leave. The text of this dialog is controlled by the browser.
//         e.preventDefault(); //per the standard
//         e.returnValue = ''; //required for Chrome
//     }
//     //else: user is allowed to leave without a warning dialog
// });