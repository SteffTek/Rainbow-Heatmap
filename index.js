/*
    Imports
*/
const cliProgress = require('cli-progress');
const { createCanvas } = require('canvas')
const mongoose = require('mongoose');
const { writeFile } = require('fs')
const path = require("path");
const config = require("./config").getConfig();

/*
    Vars
*/
const size = 256;
const scale = 4;

const canvas = createCanvas(size * scale, size * scale);
const context = canvas.getContext('2d');

const colors = [
    "",
    "#000000",
    "#808080",
    "#c0c0c0",
    "#ffffff",
    "#000080",
    "#0000ff",
    "#008080",
    "#00ffff",
    "#008000",
    "#00ff00",
    "#808000",
    "#ffff00",
    "#800000",
    "#ff0000",
    "#800080",
    "#ff00ff"
]

/*
    Load Mongo DB
*/
mongoose.connect(config.db.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}, function (err) {
    if (err) throw err;
    console.log("Connected to database!")
});

const pixelSchema = mongoose.Schema({
    timestamp: Number,
    userID: String,
    color: Number,
    x: Number,
    y: Number
});
const pixel = mongoose.model('Pixel', pixelSchema);

/*
    Paint White First
*/
context.fillStyle = "#ffffff";
context.fillRect(0,0,size * scale,size * scale);

/*
    Get Pixels
*/
pixel.find().sort({_id:1}).then(pixels => {

    /*
        Store Heatmap
    */
    var height = 0;
    var heat = {

    }

    /*
        Progress Bar
    */
    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar.start(pixels.length, 0);

    /*
        Loop Pixels to Heat Map
    */
    for(let pixel in pixels) {
        pixel = pixels[pixel];

        // CREATE OBJECT
        if(!heat[pixel.y]) {
            heat[pixel.y] = {};
        }

        // CREATE X CORD
        if(!heat[pixel.y][pixel.x]) {
            heat[pixel.y][pixel.x] = 1;
        } else {
            heat[pixel.y][pixel.x] += 1;
        }

        // GET CURRENT HEIGHT
        let currHeight = heat[pixel.y][pixel.x];
        if(currHeight > height) {
            height = currHeight;
        }

        /*
            Bar Update
        */
        bar.increment();
    }

    /*
        Stop Progress
    */
    bar.stop();

    /*
        Other Progress
    */
        const bar2 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        bar2.start(Object.keys(heat).length, 0);

    /*
        Draw Heatmap
    */
    var coldColor = "#141d4a";
    var warmColor = "#ffa600";

    for(let y = 0; y < size; y++) {
        for(let x = 0; x < size; x++) {

            let currHeight = 0;

            /* GET CURR HEIGHT FROM MAP */
            if(heat[y]) {
                if(heat[y][x]) {
                    currHeight = heat[y][x];
                }
            }

            // GET COLOR
            let percent = currHeight / height;

            let color = pSBC(percent,coldColor, warmColor);

            context.fillStyle = color;
            context.fillRect(x * scale,y * scale,scale,scale);

            // INCREASE BAR
            bar2.increment();
        }
    }

    /*
        Stop Progress
    */
    bar2.stop();

    /*
        Save File
    */

    const buffer = canvas.toBuffer();
    writeFile(path.join(__dirname, 'output', 'heatmap.png'), buffer, err => {
        if(err) throw err;
        console.log("Export successful!")
    })
});

/*
    Utils
*/
function getColor(int) {
    if(int === 0) {
        return null;
    }

    return colors[int];
}

function pSBC(p, c0, c1, l) {
    let r, g, b, P, f, t, h, i = parseInt, m = Math.round, a = typeof (c1) == "string";
    if (typeof (p) != "number" || p < -1 || p > 1 || typeof (c0) != "string" || (c0[0] != 'r' && c0[0] != '#') || (c1 && !a)) return null;
    if (!this.pSBCr) this.pSBCr = (d) => {
        let n = d.length, x = {};
        if (n > 9) {
            [r, g, b, a] = d = d.split(","), n = d.length;
            if (n < 3 || n > 4) return null;
            x.r = i(r[3] == "a" ? r.slice(5) : r.slice(4)), x.g = i(g), x.b = i(b), x.a = a ? parseFloat(a) : -1
        } else {
            if (n == 8 || n == 6 || n < 4) return null;
            if (n < 6) d = "#" + d[1] + d[1] + d[2] + d[2] + d[3] + d[3] + (n > 4 ? d[4] + d[4] : "");
            d = i(d.slice(1), 16);
            if (n == 9 || n == 5) x.r = d >> 24 & 255, x.g = d >> 16 & 255, x.b = d >> 8 & 255, x.a = m((d & 255) / 0.255) / 1000;
            else x.r = d >> 16, x.g = d >> 8 & 255, x.b = d & 255, x.a = -1
        } return x
    };
    h = c0.length > 9, h = a ? c1.length > 9 ? true : c1 == "c" ? !h : false : h, f = this.pSBCr(c0), P = p < 0, t = c1 && c1 != "c" ? this.pSBCr(c1) : P ? { r: 0, g: 0, b: 0, a: -1 } : { r: 255, g: 255, b: 255, a: -1 }, p = P ? p * -1 : p, P = 1 - p;
    if (!f || !t) return null;
    if (l) r = m(P * f.r + p * t.r), g = m(P * f.g + p * t.g), b = m(P * f.b + p * t.b);
    else r = m((P * f.r ** 2 + p * t.r ** 2) ** 0.5), g = m((P * f.g ** 2 + p * t.g ** 2) ** 0.5), b = m((P * f.b ** 2 + p * t.b ** 2) ** 0.5);
    a = f.a, t = t.a, f = a >= 0 || t >= 0, a = f ? a < 0 ? t : t < 0 ? a : a * P + t * p : 0;
    if (h) return "rgb" + (f ? "a(" : "(") + r + "," + g + "," + b + (f ? "," + m(a * 1000) / 1000 : "") + ")";
    else return "#" + (4294967296 + r * 16777216 + g * 65536 + b * 256 + (f ? m(a * 255) : 0)).toString(16).slice(1, f ? undefined : -2)
}