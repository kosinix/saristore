
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
            vApp.newItem.barcode = code // vue
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
vApp = new Vue({
    el: '#vApp',
    delimiters: ["${", "}"],
    mixins: [
        window.vueFiltersMixin,
        window.vuelidate.validationMixin,
        window.vuelidateExtendMixin,
    ],
    data: {
        page: 2,
        pending: false,
        error: '',

        newItem: {
            id: '',
            barcode: '',
            name: '',
            price: 0,
            stock: 0,
            size: '',
            unit: '',
            description: '',
            photo: '',
        },
        editedItem: {
            index: ''
        },

        items: []
    },
    validations: {

    },
    watch: {
        page: function (newPage, oldPage) {
            let me = this;

            if (newPage === 0) {
                // history.pushState({page:0},'','#home')
            } else if (newPage === 1) {



            } else if (newPage === 2) {
                // history.pushState({page:2},'','#store')


            } else if (newPage === 3) {


            }
        }
    },
    mounted: function () {
        const me = this

        db.items.toArray().then((items) => {
            me.items = items || []
        }).catch((err) => {
            console.error(err)
        })
        if (window.location.hash === '#home') {
            me.page = 0
        }
    },
    methods: {
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
        onBarcode: function () {
            Quagga.init(config, function (err) {
                if (err) {
                    console.error(err);
                    alert(err.message)
                    return;
                }
                Quagga.start();
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
            me.newItem = item
            me.editedItem.index = index
            me.page = 3
        },
        onSubmit: function () {
            const me = this;

            me.$nextTick(function () {
                me.items.push(JSON.parse(JSON.stringify(me.newItem)))
                db.items.add(JSON.parse(JSON.stringify(me.newItem))).then(() => {
                    me.clear('newItem')
                }).catch(err => {
                    console.error(err)
                })
            });
        },
        onEdit: function (index) {
            const me = this;

            me.$nextTick(function () {
                me.$set(me.items, index, JSON.parse(JSON.stringify(me.newItem)))

                db.items.update(me.newItem.id, JSON.parse(JSON.stringify(me.newItem))).then(function (updated) {
                    if (updated){
                        console.log('updated')
                    } else {

                    }
                    me.clear('newItem')
                    me.page = 2
                });
            });
        }
    }
});