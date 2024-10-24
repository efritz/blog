let CANVAS_WIDTH;  // dynamic
let CANVAS_HEIGHT; // dynamic
let TIER_HEIGHT;   // dynamic
let TIER_PADDING;  // dynamic

let TIER_BUFFER = 5;
let TIER_TOP_MARGIN = 20;
let TIER_BOTTOM_MARGIN = 45;

function configUpdated() {
    TIER_HEIGHT = (CANVAS_HEIGHT - TIER_TOP_MARGIN - TIER_BOTTOM_MARGIN - TIER_BUFFER * (configs.length - 2)) / configs.length;
    TIER_PADDING = TIER_HEIGHT / 6;
}

function draw(canvas, timestamp, log, configs, id) {
    clear(canvas);
    drawSecondLines(canvas, timestamp);
    drawLegend(canvas);

    let times = collectHits(log);
    for (var k in times) {
        drawHitTime(canvas, timestamp, k, times[k], log.tiers.length);
    }

    for (var i = 0; i < log.tiers.length; i++) {
        drawOutline(canvas, i, log.activeTier(configs, timestamp) == i);
    }

    let activeIndex = log.activeTier(configs, timestamp);

    for (var i = 0; i < log.tiers.length; i++) {
        // Draw all historic active periods
        log.tiers[i].activePeriods.forEach(period => {
            let start = period.start;
            let end = period.end || timestamp;
            drawSegment(canvas, timestamp, i, start, end, '#ddd');
        });

        // Draw all cooldown periods (historic and current)
        log.tiers[i].cooldownPeriods.forEach(period => {
            drawSegment(canvas, timestamp, i, period.start, period.end, '#fdd');
        });

        // Draw current active period
        let currentState = log.tiers[i].state(configs[i], timestamp);
        if (currentState === STATE_ACTIVE) {
            let lastPeriod = log.tiers[i].activePeriods[log.tiers[i].activePeriods.length - 1];
            let a = lastPeriod.start;
            let b = a + configs[i].active;
            drawSegment(canvas, timestamp, i, a, b, i === activeIndex ? '#aaf' : '#ddd');
        }

        if (log.activeTier(configs, timestamp) == i) {
            let d = configs[i].window;
            let e = Math.min(timestamp - log.tiers[i].activePeriods[log.tiers[i].activePeriods.length - 1].start, d);

            if (i == 0) {
                canvas.drawRect({
                    x: CANVAS_WIDTH - d,
                    y: getTierTop(i) + TIER_HEIGHT / 4,
                    width: d - e,
                    height: TIER_HEIGHT / 2,
                    fillStyle: 'rgba(0, 0, 0, 0)', // Clear fill
                    strokeStyle: '#000',
                    fromCenter: false,
                });
            }

            canvas.drawRect({
                x: CANVAS_WIDTH - e,
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
    updateStatusText(log, configs, timestamp);

    // Draw the window bracket for the active tier
    if (activeIndex >= 0) {
        let activeTier = log.tiers[activeIndex];
        let config = configs[activeIndex];
        let lastPeriodStart = activeTier.activePeriods.length > 0 ? activeTier.activePeriods[activeTier.activePeriods.length - 1].start : timestamp;
        let elapsedTime = timestamp - lastPeriodStart;
        let bracketY = getTierTop(activeIndex) + TIER_HEIGHT * 3/4 + 10; // Position the bracket at the bottom of the rectangle
        drawWindowBracket(canvas, config.window, Math.min(elapsedTime, config.window), bracketY);
    }

    // Legend is already drawn at the top
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
        x1: CANVAS_WIDTH,
        y1: 0,
        x2: CANVAS_WIDTH,
        y2: CANVAS_HEIGHT,
        strokeStyle: '#000',
        strokeWidth: 2
    });

    $('#timestamp').text(Math.floor(timestamp / 100));
}

function drawSecondLines(canvas, timestamp) {
    const secondWidth = 100; // 100 units = 1 second
    const numSeconds = Math.ceil(CANVAS_WIDTH / secondWidth);
    const ctx = canvas[0].getContext('2d');
    ctx.font = '12px Arial, sans-serif';

    for (let i = 0; i < numSeconds; i++) {
        const x = CANVAS_WIDTH - i * secondWidth;
        const isLabeled = i % 5 === 0 || i === 0;

        canvas.drawLine({
            x1: x,
            y1: TIER_TOP_MARGIN,
            x2: x,
            y2: CANVAS_HEIGHT,
            strokeStyle: isLabeled ? '#aaa' : '#ddd',
            strokeWidth: isLabeled ? 1.5 : 1
        });

        // Add text label for every 5th second
        if (isLabeled) {
            let label = i === 0 ? 'now' :
                        i === 5 ? '5s ago' : 
                        i === 10 ? '10s ago' : 
                        `${i}s ago`;

            const textWidth = ctx.measureText(label).width;
            const textX = x - textWidth;

            canvas.drawText({
                fillStyle: '#444',
                x: textX,
                y: CANVAS_HEIGHT - 3,
                text: label,
                fontSize: 12,
                fontFamily: 'Arial, sans-serif',
                align: 'left',
                baseline: 'bottom'
            });
        }
    }
}

function formatTimeRemaining(seconds) {
    seconds = Math.ceil(seconds);
    if (seconds < 60) {
        return seconds + 's';
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m${remainingSeconds > 0 ? remainingSeconds + 's' : ''}`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const remainingMinutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        let result = `${hours}h`;
        if (remainingMinutes > 0 || remainingSeconds > 0) {
            result += `${remainingMinutes}m`;
        }
        if (remainingSeconds > 0) {
            result += `${remainingSeconds}s`;
        }
        return result;
    }
}

function updateStatusText(log, configs, timestamp) {
    let activeIndex = log.activeTier(configs, timestamp);
    var hitsInWindow = 0;
    var windowSize = 0;
    var timeLeftInTier = 0;

    if (activeIndex >= 0) {
        let activeTier = log.tiers[activeIndex];
        let config = configs[activeIndex];

        activeTier.trim(config, timestamp);
        hitsInWindow = activeTier.hitsInWindow;
        windowSize = config.limit;
        
        if (activeTier.activePeriods.length > 0) {
            let lastPeriod = activeTier.activePeriods[activeTier.activePeriods.length - 1];
            let elapsedTime = timestamp - lastPeriod.start;
            timeLeftInTier = Math.max(0, (config.active - elapsedTime) / 100);
        }
    }

    if (activeIndex >= 0) {
        let activeTierSeconds = configs[activeIndex].active / 100;
        let formattedTimeLeft = formatTimeRemaining(timeLeftInTier);
        let formattedTotalTime = formatTimeRemaining(activeTierSeconds);
        $('#hits-in-window').text(`${hitsInWindow}/${windowSize} requests in window (${formattedTimeLeft}/${formattedTotalTime} remaining in tier)`);
    } else {
        $('#hits-in-window').text('No requests in window');
    }
}

function drawSegment(canvas, timestamp, tier, lo, hi, color) {
    canvas.drawRect({
        x: CANVAS_WIDTH - timestamp + lo,
        y: getTierTop(tier) + TIER_PADDING,
        width: hi - lo,
        height: TIER_HEIGHT - TIER_PADDING * 2,
        fillStyle: color,
        strokeStyle: '#000',
        fromCenter: false,
    });
}

function drawHit(canvas, timestamp, tier, hit, id) {
    let r = hit.count + 2;

    canvas.drawArc({
        x: CANVAS_WIDTH - timestamp + hit.timestamp - r,
        y: getTierTop(tier) + TIER_HEIGHT / 2 - r,
        radius: r,
        fillStyle: hit.count == 0 ? '#f00' : (id == hit.id ? '#0f0' : '#999'), // Changed '#fff' to '#0f0' for green
        strokeStyle: '#000',
        fromCenter: false,
    });
}

function drawRejection(canvas, timestamp, tier, rejection, id) {
    let x = CANVAS_WIDTH - timestamp + rejection.timestamp;
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
    let x = CANVAS_WIDTH - timestamp + time;
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

    let x = CANVAS_WIDTH - (timestamp - time);
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
    return CANVAS_HEIGHT - TIER_BOTTOM_MARGIN - TIER_HEIGHT * (tier + 1) - TIER_BUFFER * (tier - 1);
}

function drawWindowBracket(canvas, windowSize, currentWidth, y) {
    const bracketHeight = 10;
    const endLineLength = 5;
    const ctx = canvas[0].getContext('2d');
    ctx.font = '12px Arial, sans-serif';
    
    const startX = CANVAS_WIDTH - currentWidth;
    const endX = CANVAS_WIDTH;
    const midX = (startX + endX) / 2;
    
    // Draw the bracket
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX, y + endLineLength);
    ctx.lineTo(endX, y + endLineLength);
    ctx.lineTo(endX, y);
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Add the label
    const formattedTime = formatTimeRemaining(windowSize / 100);
    const label = `Window (${formattedTime})`;
    const textWidth = ctx.measureText(label).width;
    let textX = Math.max(midX, CANVAS_WIDTH / 2 + textWidth / 2);
    
    canvas.drawText({
        fillStyle: '#000',
        x: textX,
        y: y + bracketHeight + 2, // Reduced space between bracket and text
        text: label,
        fontSize: 12,
        fontFamily: 'Arial, sans-serif',
        align: 'center',
        baseline: 'top'
    });
}

function resizeCanvas() {
    const numTiers = $('#tiers tbody tr').length;
    CANVAS_WIDTH = window.innerWidth;
    CANVAS_HEIGHT = Math.min(400, numTiers * 100) + 30; // Add 30px for legend at the top
    $('.canvasWrapper .canvas-container').css('height', CANVAS_HEIGHT + 'px');
    $('#canvas').attr('width', CANVAS_WIDTH);
    $('#canvas').attr('height', CANVAS_HEIGHT);
    configUpdated();
}

function drawLegend(canvas) {
    const ctx = canvas[0].getContext('2d');
    ctx.font = '12px Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';

    const legendItems = [
        { type: 'arc', fillStyle: '#0f0', strokeStyle: '#000', text: 'Granted' },
        { type: 'cross', strokeStyle: '#f00', text: 'Rejected' },
        { type: 'rect', fillStyle: '#aaf', strokeStyle: '#000', text: 'Tier is active' },
        { type: 'rect', fillStyle: '#fdd', strokeStyle: '#000', text: 'Tier is in cooldown' }
    ];

    const itemWidth = 120;
    const totalWidth = itemWidth * legendItems.length;
    let x = (CANVAS_WIDTH - totalWidth) / 2;

    legendItems.forEach(item => {
        switch(item.type) {
            case 'arc':
                canvas.drawArc({
                    x: x + 5,
                    y: 8,
                    radius: 5,
                    fillStyle: item.fillStyle,
                    strokeStyle: item.strokeStyle
                });
                break;

            case 'cross':
                canvas.drawLine({
                    x1: x,
                    y1: 4,
                    x2: x + 10,
                    y2: 14,
                    strokeStyle: item.strokeStyle
                });
                canvas.drawLine({
                    x1: x,
                    y1: 14,
                    x2: x + 10,
                    y2: 4,
                    strokeStyle: item.strokeStyle
                });
                break;

            case 'rect':
                canvas.drawRect({
                    x: x,
                    y: 9,
                    width: 10,
                    height: 10,
                    fillStyle: item.fillStyle,
                    strokeStyle: item.strokeStyle
                });
                break;
        }

        ctx.fillText(item.text, x + 15, 10);
        x += itemWidth;
    });
}

$(document).ready(function() {
    resizeCanvas();
    $(window).resize(resizeCanvas);
});
