let CANVAS_WIDTH  = 750;
let CANVAS_HEIGHT = 200;

let NOW_MARGIN = 50;
let NOW_BUFFER = 30;
let TIER_HEIGHT = 20;
let TIER_SPACE = 5;
let TIER_BORDER = 5;
let TIER_MARGIN = 20;

function configUpdated() {
    TIER_HEIGHT = (CANVAS_HEIGHT - TIER_MARGIN - NOW_BUFFER - TIER_SPACE * (configs.length - 2)) / configs.length;
}

function draw(canvas, timestamp, log, configs, id) {
    clear(canvas);

    let times = collectHits(log);
    for (var k in times) {
        drawHitTime(canvas, timestamp, k, times[k], log.tiers.length);
    }

    for (var i = 0; i < log.tiers.length; i++) {
        drawOutline(canvas, i, log.activeTier(configs, timestamp) == i);
    }

    for (var i = 0; i < log.tiers.length; i++) {
        let a = log.tiers[i].entry;
        let b = log.tiers[i].entry + configs[i].active;
        let c = log.tiers[i].entry + configs[i].active + configs[i].cooldown;

        drawSegment(canvas, timestamp, i, a, b, '#0f0');
        drawSegment(canvas, timestamp, i, b, c, '#f00');

        if (log.activeTier(configs, timestamp) == i) {
            let d = configs[i].window;
            let e = Math.min(timestamp - a, d);

            if (i == 0) {
                canvas.drawRect({
                    x: CANVAS_WIDTH - NOW_MARGIN - d,
                    y: getTierTop(i) + TIER_HEIGHT / 4,
                    width: d - e,
                    height: TIER_HEIGHT / 2,
                    fillStyle: '#f99',
                    strokeStyle: '#000',
                    fromCenter: false,
                });
            }

            canvas.drawRect({
                x: CANVAS_WIDTH - NOW_MARGIN - e,
                y: getTierTop(i) + TIER_HEIGHT / 4,
                width: e,
                height: TIER_HEIGHT / 2,
                fillStyle: '#99f',
                strokeStyle: '#000',
                fromCenter: false,
            });
        }
    }

    function findSiblingWeight(log, i, timestamp) {
        if (i + 1 < log.tiers.length) {
            var hits = log.tiers[i + 1].hits;
            for (var j in hits) {
                if (hits[j].timestamp == timestamp) {
                    return hits[j].count;
                }
            }
        }

        return -1;
    }

    var bursts = [];
    for (var i = 0; i < log.tiers.length; i++) {
        var hits = log.tiers[i].hits;
        for (var j in hits) {
            drawHit(canvas, timestamp, i, hits[j], id);

            let siblingWeight = findSiblingWeight(log, i, hits[j].timestamp);
            if (siblingWeight != -1) {
                bursts.push({ i: i, hit: hits[j], weight: siblingWeight });
            }
        }

        for (var j in log.tiers[i].rejections) {
            drawRejection(canvas, timestamp, i, log.tiers[i].rejections[j], id);
        }
    }

    for (var i in bursts) {
        drawBurst(canvas, timestamp, bursts[i].i, bursts[i].hit.timestamp, bursts[i].hit.count, bursts[i].weight);
    }

    drawNow(canvas, timestamp);
    drawStatusText(canvas, log, configs, timestamp);
}

function clear(canvas) {
    canvas.drawRect({
        x: 0,
        y: 0,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        fillStyle: '#fff',
        fromCenter: false,
    });
}

function drawNow(canvas, timestamp) {
    canvas.drawLine({
        x1: CANVAS_WIDTH - NOW_MARGIN,
        y1: NOW_BUFFER,
        x2: CANVAS_WIDTH - NOW_MARGIN,
        y2: CANVAS_HEIGHT,
        strokeStyle: '#000',
    });

    canvas.drawText({
        text: Math.floor(timestamp / 100),
        x: CANVAS_WIDTH - NOW_MARGIN,
        y: NOW_BUFFER / 2,
        fontSize: 12,
        fillStyle: '#000',
        fontFamily: 'Trebuchet MS, sans-serif',
    });
}

function drawStatusText(canvas, log, configs, timestamp) {
    let activeIndex = log.activeTier(configs, timestamp);
    var hitsInWindow = 0;

    if (activeIndex >= 0) {
        let activeTier = log.tiers[activeIndex];

        activeTier.trim(configs[activeIndex], timestamp);
        hitsInWindow = activeTier.hitsInWindow;
    }

    let lines = [`Active Tier: ${activeIndex + 1}`];

    if (activeIndex >= 0) {
        lines.push(`Limit for Window: ${configs[activeIndex].limit} hits/${configs[activeIndex].window / 100 == 1 ? 'second' : `${configs[activeIndex].window / 100} seconds`}`);
    }

    lines.push(`Hits in Window: ${hitsInWindow}`);

    canvas.drawText({
        text: lines.join(', '),
        x: 0,
        y: NOW_BUFFER / 2 - 5,
        fontSize: 12,
        fillStyle: '#000',
        fontFamily: 'Trebuchet MS, sans-serif',
        fromCenter: false,
    });
}

function drawSegment(canvas, timestamp, tier, lo, hi, color) {
    canvas.drawRect({
        x: CANVAS_WIDTH - NOW_MARGIN - timestamp + lo,
        y: getTierTop(tier) + TIER_BORDER,
        width: hi - lo,
        height: TIER_HEIGHT - TIER_BORDER * 2,
        fillStyle: color,
        strokeStyle: '#000',
        fromCenter: false,
    });
}

function drawHit(canvas, timestamp, tier, hit, id) {
    let r = hit.count + 2;

    canvas.drawArc({
        x: CANVAS_WIDTH - NOW_MARGIN - timestamp + hit.timestamp - r,
        y: getTierTop(tier) + TIER_HEIGHT / 2 - r,
        radius: r,
        fillStyle: hit.count == 0 ? '#f00' : (id == hit.id ? '#fff' : '#999'),
        strokeStyle: '#000',
        fromCenter: false,
    });
}

function drawRejection(canvas, timestamp, tier, rejection, id) {
    let x = CANVAS_WIDTH - NOW_MARGIN - timestamp + rejection.timestamp;
    let y = getTierTop(tier) + TIER_HEIGHT / 2;
    let r = 3;

    canvas.drawLine({
        x1: x - r,
        y1: y - r,
        x2: x + r,
        y2: y + r,
        strokeStyle: id == rejection.id ? '#f00' : '#999',
        fromCenter: false,
    });

    canvas.drawLine({
        x1: x - r,
        y1: y + r,
        x2: x + r,
        y2: y - r,
        strokeStyle: id == rejection.id ? '#f00' : '#999',
        fromCenter: false,
    });
}

function drawBurst(canvas, timestamp, tier, time, weight, targetWeight) {
    let x = CANVAS_WIDTH - NOW_MARGIN - timestamp + time;
    let y1 = getTierTop(tier + 0) + TIER_HEIGHT / 2 - (weight + 2);
    let y2 = getTierTop(tier + 1) + TIER_HEIGHT / 2 + (targetWeight + 2);

    canvas.drawQuadratic({
        x1: x - weight,
        y1: y1,
        x2: x - targetWeight,
        y2: y2,
        cx1: x - 30,
        cy1: (y2 - y1) / 2 + y1,
        strokeStyle: '#000',
        endArrow: true,
        arrowAngle: 35,
        arrowRadius: 10,
    });
}

function drawHitTime(canvas, timestamp, time, weight, tiers) {
    if (weight <= 1) {
        return;
    }

    let x = CANVAS_WIDTH - NOW_MARGIN - (timestamp - time);
    let y = getTierTop(tiers) + TIER_HEIGHT;

    canvas.drawText({
        text: weight,
        x: x,
        y: CANVAS_HEIGHT - 5,
        fontSize: 12,
        fillStyle: '#000',
        fontFamily: 'Trebuchet MS, sans-serif',
    });
}

function drawOutline(canvas, i, isActive) {
    if (isActive) {
        canvas.drawRect({
            x: 0,
            y: getTierTop(i),
            width: CANVAS_WIDTH,
            height: TIER_HEIGHT,
            fillStyle: '#aaf',
            fromCenter: false,
        });
    }

    canvas.drawRect({
        x: 0,
        y: getTierTop(i),
        width: CANVAS_WIDTH,
        height: TIER_HEIGHT,
        strokeStyle: '#aaa',
        strokeDash: [2],
        strokeDashOffset: 0,
        fromCenter: false,
    });
}

function collectHits(log) {
    let times = {};
    for (var i = 0; i < log.tiers.length; i++) {
        var hits = log.tiers[i].hits;

        for (var j in hits) {
            if (times[hits[j].timestamp]) {
                times[hits[j].timestamp] += hits[j].count;
            } else {
                times[hits[j].timestamp] = hits[j].count;
            }
        }
    }

    return times;
}

function getTierTop(tier) {
    return CANVAS_HEIGHT - TIER_MARGIN - TIER_HEIGHT * (tier + 1) - TIER_SPACE * (tier - 1);
}

$(document).ready(function() {
    CANVAS_WIDTH = window.innerWidth - 20;
    $('#canvas').attr('width', CANVAS_WIDTH);
});
