//// Core modules

//// External modules
const express = require('express');
const kalendaryo = require('kalendaryo');
const moment = require('moment')

//// Modules
    

let router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const momentNow = moment()
        const weekStart = 0 // What weekday the calendar starts. 0 - Sunday (default), 1 - Mon, 2 - Tue, 3, 4, 5, 6.
    
        let matrix = kalendaryo.getMatrix(momentNow, weekStart)

        res.render('index.html', {
            matrix: matrix,
            month: momentNow.format('MMM'),
            year: momentNow.format('YYYY'),
        })
    } catch (err) {
        next(err);
    }
});

module.exports = router;
