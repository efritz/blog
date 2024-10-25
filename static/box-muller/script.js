const epsilon = 0.001;
const numBuckets = 50;
const uniformChartMargin = { top: 20, right: 20, bottom: 40, left: 50 };
const distributionChartMargin = { top: 20, right: 20, bottom: 60, left: 60 };

const rChoices = {
    'u1': {
        label: 'U₁',
        value: u1 => u1,
        inverse: r => r,
    },
    'lnU1': {
        label: '-ln(U₁)',
        value: u1 => -Math.log(u1),
        inverse: r => Math.exp(-r),
    },
    'lnU12': {
        label: '-ln(U₁) * 2',
        value: u1 => -Math.log(u1) * 2,
        inverse: r => Math.exp(-r / 2),
    },
    'sqrtU1': {
        label: '√(U₁)',
        value: u1 => Math.sqrt(u1),
        inverse: r => r * r,
    },
    'sqrtLnU1': {
        label: '√(-ln(U₁))',
        value: u1 => Math.sqrt(-Math.log(u1)),
        inverse: r => Math.exp(-r * r),
    },
    'sqrtLnU12': {
        label: '√(-ln(U₁) * 2)',
        value: u1 => Math.sqrt(-Math.log(u1) * 2),
        inverse: r => Math.exp(-r * r / 2),
    },
};

const thetaChoices = {
    'u2': {
        label: 'U₂',
        value: u2 => u2,
        inverse: theta => theta,
    },
    'pi': {
        label: 'U₂ * π',
        value: u2 => u2 * Math.PI,
        inverse: theta => theta / Math.PI,
    },
    '2pi': {
        label: 'U₂ * 2π',
        value: u2 => u2 * 2 * Math.PI,
        inverse: theta => theta / (2 * Math.PI),
    },
    '4pi': {
        label: 'U₂ * 4π',
        value: u2 => u2 * 4 * Math.PI,
        inverse: theta => theta / (4 * Math.PI),
    },
}

function format(expression, userMean, userStddev) {
    let e = expression;
    if (userStddev !== 1) {
        e = `${userStddev} * ${e}`;
    }
    if (userMean !== 0) {
        e = `${userMean} + ${e}`;
    }

    return e;
}

const nChoices = {
    'theta': {
        label: 'μ + σ * [θ]',
        expr: (rChoice, thetaChoice, userMean, userStddev) => format(`[${thetaChoices[thetaChoice].label}]`, userMean, userStddev),
        value: (r, theta) => theta,
    },
    'sinTheta': {
        label: 'μ + σ * [sin(θ)]',
        expr: (rChoice, thetaChoice, userMean, userStddev) => format(`[sin(${thetaChoices[thetaChoice].label})]`, userMean, userStddev),
        value: (r, theta) => Math.sin(theta),
    },
    'cosTheta': {
        label: 'μ + σ * [cos(θ)]',
        expr: (rChoice, thetaChoice, userMean, userStddev) => format(`[cos(${thetaChoices[thetaChoice].label})]`, userMean, userStddev),
        value: (r, theta) => Math.cos(theta),
    },
    'r': {
        label: 'μ + σ * [r]',
        expr: (rChoice, thetaChoice, userMean, userStddev) => format(`[${rChoices[rChoice].label}]`, userMean, userStddev),
        value: (r, theta) => r,
    },
    'thetaR': {
        label: 'μ + σ * [r * θ]',
        expr: (rChoice, thetaChoice, userMean, userStddev) => format(`[${rChoices[rChoice].label} * ${thetaChoices[thetaChoice].label}]`, userMean, userStddev),
        value: (r, theta) => r * theta,
    },
    'sinThetaR': {
        label: 'μ + σ * [r * sin(θ)]',
        expr: (rChoice, thetaChoice, userMean, userStddev) => format(`[${rChoices[rChoice].label} * sin(${thetaChoices[thetaChoice].label})]`, userMean, userStddev),
        value: (r, theta) => r * Math.sin(theta),
    },
    'cosThetaR': {
        label: 'μ + σ * [r * cos(θ)]',
        expr: (rChoice, thetaChoice, userMean, userStddev) => format(`[${rChoices[rChoice].label} * cos(${thetaChoices[thetaChoice].label})]`, userMean, userStddev),
        value: (r, theta) => r * Math.cos(theta),
    },
};

const textBackgroundColor = 'rgba(255, 255, 255, 0.7)';
const gridlineBackgroundColor = 'rgba(255, 255, 255, 0.3)';
const gridlineForegroundColor = 'rgba(0, 0, 0, 0.7)';
const gridlineBackgroundWidth = 5;
const gridlineForegroundWidth = 1;

const outlined = (ctx, f) => {
    ctx.strokeStyle = gridlineBackgroundColor;
    ctx.lineWidth = gridlineBackgroundWidth;
    f(ctx);

    ctx.strokeStyle = gridlineForegroundColor;
    ctx.lineWidth = gridlineForegroundWidth;
    f(ctx);
}

function valuesForDot(dot, rChoice, thetaChoice, nChoice) {
    const safeU1 = dot.u1 === 0 ? epsilon : dot.u1 === 1 ? (1 - epsilon) : dot.u1;
    const r = rChoices[rChoice].value(safeU1);
    const theta = thetaChoices[thetaChoice].value(dot.u2);
    const n = nChoice === '' ? NaN : nChoices[nChoice].value(r, theta);
    return { r, theta, n };
}

function generateUniformDots(n) {
    const dots = [];
    for (let i = 0; i < n; i++) {
        dots.push({ u1: Math.random(), u2: Math.random() });
    }

    return dots;
}

function populateSelectOptions() {
    Object.entries(rChoices).forEach(([key, value]) => {
        $('#rChoice').append($('<option>', {
            value: key,
            text: value.label
        }));
    });

    Object.entries(thetaChoices).forEach(([key, value]) => {
        $('#thetaChoice').append($('<option>', {
            value: key,
            text: value.label
        }));
    });

    Object.entries(nChoices).forEach(([key, value]) => {
        $('#nChoice').append($('<option>', {
            value: key,
            text: value.label
        }));
    });

    $('#rChoice').val('sqrtLnU12');
    $('#thetaChoice').val('2pi');
    $('#nChoice').val('cosThetaR');
}

function newColorCalculator(dots, rChoice, thetaChoice, nChoice, highlightedBar) {
    if (nChoice === '') {
        return (index) => {
            const dot = dots[index];
            const u1 = dot.u1;
            const u2 = dot.u2;
            return `rgba(${Math.floor(u1 * 255)}, ${Math.floor(u2 * 255)}, 0, 0.75)`;
        }
    }

    const values = dots.map(dot => valuesForDot(dot, rChoice, thetaChoice, nChoice)).map(({ n }) => n);

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const bucketSize = range / numBuckets;
    const maxAbs = Math.max(...values.map(value => Math.abs(value)));

    return (index, opaque = false) => {
        const value = values[index];

        // Highlight all dots that would fall in the highlighted bar as black
        if (highlightedBar !== null && Math.min(Math.floor((value - min) / bucketSize), numBuckets - 1) === highlightedBar) {
            return 'black';
        }

        const normalizedDistance = Math.abs(value) / maxAbs;
        const red = (Math.floor(normalizedDistance * 255));
        const blue = Math.floor((1 - normalizedDistance) * 255);
        return `rgba(${red}, 0, ${blue}, ${opaque ? 1 : 0.75})`;
    }
};

function drawAllGraphs(
    $uniformCanvas,
    $polarCanvas,
    $distributionCanvas,
    dots, rChoice, thetaChoice, nChoice, userDot, highlightedBar
) {
    drawUniformDots($uniformCanvas, $uniformCanvas.getContext('2d'), dots, rChoice, thetaChoice, nChoice, userDot, highlightedBar);
    drawPolarDots($polarCanvas, $polarCanvas.getContext('2d'), dots, rChoice, thetaChoice, nChoice, userDot, highlightedBar);
    drawDistributionChart($distributionCanvas, $distributionCanvas.getContext('2d'), dots, rChoice, thetaChoice, nChoice, userDot, highlightedBar);
}

function drawUniformDots($canvas, ctx, dots, rChoice, thetaChoice, nChoice, userDot, highlightedBar) {
    const canvasWidth = $canvas.width;
    const canvasHeight = $canvas.height;
    const chartWidth = canvasWidth - uniformChartMargin.left - uniformChartMargin.right;
    const chartHeight = canvasHeight - uniformChartMargin.top - uniformChartMargin.bottom;
    const gridlineStep = chartWidth / 10;

    // Clear the canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    //
    // Draw dots

    const calculateColor = newColorCalculator(dots, rChoice, thetaChoice, nChoice, highlightedBar,);

    const coordsAndColors = dots.map((dot, index) => ({
        x: uniformChartMargin.left + dot.u1 * chartWidth,
        y: canvasHeight - uniformChartMargin.bottom - dot.u2 * chartHeight,
        // Calculate color based on distance from mean of r * cos(θ)
        color: calculateColor(index),
    }));

    const drawSet = set => set.forEach(({ x, y, color }) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
    });

    drawSet(coordsAndColors.filter(({ color }) => color !== 'black'));

    //
    // Draw gridlines

    ctx.save();
    ctx.translate(uniformChartMargin.left, uniformChartMargin.top);

    for (let i = gridlineStep; i < chartWidth; i += gridlineStep) {
        outlined(ctx, ctx => {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, chartHeight);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(chartWidth, i);
            ctx.stroke();
        });
    }

    ctx.restore();

    //
    // Draw black dots

    drawSet(coordsAndColors.filter(({ color }) => color === 'black'));

    // Draw user dot in black
    if (userDot) {
        const x = uniformChartMargin.left + userDot.u1 * chartWidth;
        const y = uniformChartMargin.top + (1 - userDot.u2) * chartHeight;

        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();

        // Draw horizontal and vertical lines to the axes
        ctx.beginPath();
        ctx.moveTo(uniformChartMargin.left, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, canvasHeight - uniformChartMargin.bottom);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Remove the separate U₁ and U₂ value display as they are now on the axis labels
    }

    // Draw axes
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(uniformChartMargin.left, canvasHeight - uniformChartMargin.bottom);
    ctx.lineTo(canvasWidth - uniformChartMargin.right, canvasHeight - uniformChartMargin.bottom);
    ctx.moveTo(uniformChartMargin.left, uniformChartMargin.top);
    ctx.lineTo(uniformChartMargin.left, canvasHeight - uniformChartMargin.bottom);
    ctx.stroke();

    // Draw x-axis labels
    ctx.fillStyle = 'black';
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i <= 10; i++) {
        const x = uniformChartMargin.left + (i / 10) * chartWidth;
        const label = (i / 10).toFixed(1);
        ctx.fillText(label, x, canvasHeight - uniformChartMargin.bottom + 5);
    }

    // Draw y-axis labels
    ctx.fillStyle = 'black';
    ctx.font = '9px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 10; i++) {
        const y = canvasHeight - uniformChartMargin.bottom - (i / 10) * chartHeight;
        const label = (i / 10).toFixed(1);
        ctx.fillText(label, uniformChartMargin.left - 5, y);
    }

    // Draw legends
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`U₁${userDot ? ' = ' + userDot.u1.toFixed(2) : ''}`, canvasWidth / 2, canvasHeight - 15);
    ctx.save();
    ctx.translate(15, canvasHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`U₂${userDot ? ' = ' + userDot.u2.toFixed(2) : ''}`, 0, 0);
    ctx.restore();
}

// Add background to polar coordinates text
const addBackgroundToText = (ctx, text, x, y, align = 'left', baseline = 'top') => {
    const padding = 2;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    let bgX = x - padding;
    let bgY = y - padding;

    if (align === 'center') bgX -= textWidth / 2;
    else if (align === 'right') bgX -= textWidth;

    if (baseline === 'middle') bgY -= textHeight / 2;
    else if (baseline === 'bottom') bgY -= textHeight;

    ctx.fillStyle = textBackgroundColor; // Semi-transparent white background
    ctx.fillRect(bgX, bgY, textWidth + 2 * padding, textHeight + 2 * padding);

    ctx.fillStyle = 'black'; // Black text for better visibility
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
};


function drawPolarDots($canvas, ctx, dots, rChoice, thetaChoice, nChoice, userDot, highlightedBar) {
    const rFormula = rChoices[rChoice].label;
    const thetaFormula = thetaChoices[thetaChoice].label;
    const userMean = parseFloat($('#mean').val());
    const userStddev = parseFloat($('#stddev').val());
    const nFormula = nChoice ? nChoices[nChoice].expr(rChoice, thetaChoice, userMean, userStddev) : '';
    const fullWidth = $canvas.width;
    const fullHeight = $canvas.height;
    const centerX = fullWidth / 2;
    const centerY = fullHeight / 2;
    const maxRadius = Math.min(fullWidth, fullHeight) / 2 - 60;

    // Clear the canvas
    ctx.clearRect(0, 0, fullWidth, fullHeight);

    //
    // Draw dots

    const calculateColor = newColorCalculator(dots, rChoice, thetaChoice, nChoice, highlightedBar);

    const coordsAndColors = dots.map((dot, index) => {
        const { r, theta } = valuesForDot(dot, rChoice, thetaChoice, nChoice);

        return {
            x: centerX + r * Math.cos(theta) * maxRadius / 3,
            y: centerY - r * Math.sin(theta) * maxRadius / 3,
            // Calculate color based on distance from mean of r * cos(θ);
            color: calculateColor(index),
        }
    });

    const drawSet = set => set.forEach(({ x, y, color }) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
    })

    drawSet(coordsAndColors.filter(({ color }) => color !== 'black'));

    // Draw circular gridlines

    for (let r = maxRadius / 3; r <= maxRadius * (3.5 / 3); r += maxRadius / 3) {
        outlined(ctx, ctx => {
            ctx.beginPath();
            ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
            ctx.stroke();
        });
    }

    // Draw radial lines

    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 6) {
        ctx.strokeStyle = gridlineBackgroundColor;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + maxRadius * (3.5 / 3) * Math.cos(angle), centerY - maxRadius * (3.5 / 3) * Math.sin(angle));
        ctx.stroke();

        ctx.strokeStyle = gridlineForegroundColor;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + maxRadius * (3.5 / 3) * Math.cos(angle), centerY - maxRadius * (3.5 / 3) * Math.sin(angle));
        ctx.stroke();
    }

    //
    // Draw black dots

    drawSet(coordsAndColors.filter(({ color }) => color === 'black'));

    // Draw the user dot in black
    if (userDot) {
        const { r, theta } = valuesForDot(userDot, rChoice, thetaChoice, nChoice);
        const x = centerX + r * Math.cos(theta) * maxRadius / 3;
        const y = centerY - r * Math.sin(theta) * maxRadius / 3;

        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();

        // Draw a line from the center to the user dot
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Update r and θ legends for the user dot
        ctx.font = '11px Arial';
        ctx.textBaseline = 'top';

        // Calculate the width of the largest formula
        ctx.textAlign = 'left';
        const rWidth = ctx.measureText(rFormula).width;
        const thetaWidth = ctx.measureText(thetaFormula).width;
        const maxFormulaWidth = Math.max(rWidth, thetaWidth);

        // Align the labels and formulas
        const labelX = 20;
        const formulaX = 25;
        const valueX = formulaX + maxFormulaWidth + 5;

        addBackgroundToText(ctx, 'r', labelX - 12, 10, 'center');
        addBackgroundToText(ctx, 'θ', labelX - 12, 25, 'center');
        addBackgroundToText(ctx, '=', labelX+2, 10, 'right');
        addBackgroundToText(ctx, '=', labelX+2, 25, 'right');

        addBackgroundToText(ctx, `${rFormula}`, formulaX, 10);
        addBackgroundToText(ctx, `${thetaFormula}`, formulaX, 25);

        // Align the values
        addBackgroundToText(ctx, `= ${r.toFixed(2)}`, valueX, 10);
        addBackgroundToText(ctx, `= ${theta.toFixed(2)}`, valueX, 25);
    }

    // Add angle labels
    ctx.font = '12px Arial';

    [
        { angle: 0, label: '0π', align: 'left', baseline: 'middle' },
        { angle: Math.PI / 2, label: 'π/2', align: 'center', baseline: 'bottom' },
        { angle: Math.PI, label: 'π', align: 'right', baseline: 'middle' },
        { angle: 3 * Math.PI / 2, label: '3π/2', align: 'center', baseline: 'top' }
    ].forEach(({ angle, label, align, baseline }) => {
        const x = centerX + Math.cos(angle) * (maxRadius * (3.5 / 3) + 20);
        const y = centerY - Math.sin(angle) * (maxRadius * (3.5 / 3) + 20);
        addBackgroundToText(ctx, label, x, y, align, baseline);
    });

    // Add r labels
    ctx.font = '12px Arial';

    for (let i = 1; i <= 3; i++) {
        const x = centerX + (i * maxRadius / 3) + 5;
        const y = centerY + 5;
        addBackgroundToText(ctx, i.toString(), x, y, 'left', 'top');
    }

    // Add legend for r and θ formulas in the upper left corner
    if (!userDot) {
        ctx.font = '11px Arial';
        ctx.textBaseline = 'top';

        // Calculate the width of the largest formula
        ctx.textAlign = 'left';
        const rWidth = ctx.measureText(rFormula).width;
        const thetaWidth = ctx.measureText(thetaFormula).width;

        // Align the labels and formulas
        const labelX = 20;
        const formulaX = 25;

        addBackgroundToText(ctx, 'r', labelX - 12, 10, 'center');
        addBackgroundToText(ctx, 'θ', labelX - 12, 25, 'center');
        addBackgroundToText(ctx, '=', labelX + 2, 10, 'right');
        addBackgroundToText(ctx, '=', labelX + 2, 25, 'right');

        addBackgroundToText(ctx, rFormula, formulaX, 10);
        addBackgroundToText(ctx, thetaFormula, formulaX, 25);
    }
}

function drawDistributionChart($canvas, ctx, dots, rChoice, thetaChoice, nChoice, userDot, highlightedBar) {
    const tailPercentage = 0.1; // 10% for each tail
    const tailShadeColor = 'rgba(200, 200, 200, 0.2)'; // Light gray with 20% opacity
    const canvasWidth = $canvas.width;
    const canvasHeight = $canvas.height;
    const chartWidth = canvasWidth - distributionChartMargin.left - distributionChartMargin.right;
    const chartHeight = canvasHeight - distributionChartMargin.top - distributionChartMargin.bottom;

    // Clear the canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Calculate histogram
    const userMean = parseFloat($('#mean').val());
    const userStddev = parseFloat($('#stddev').val());

    const transform = (dot) => userMean + userStddev * valuesForDot(dot, rChoice, thetaChoice, nChoice).n;
    const values = dots.map(transform);

    let userValue = null;
    if (userDot) {
        userValue = transform(userDot);
        values.push(userValue);
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const bucketSize = range / numBuckets;

    const buckets = new Array(numBuckets).fill(0);
    values.forEach(value => {
        const bucketIndex = Math.min(Math.floor((value - min) / bucketSize), numBuckets - 1);
        buckets[bucketIndex]++;
    });

    // Calculate tail buckets
    const totalDots = dots.length;
    const tailDots = Math.floor(totalDots * tailPercentage);
    let leftTailCount = 0;
    let rightTailCount = 0;
    let leftTailBuckets = 0;
    let rightTailBuckets = 0;

    for (let i = 0; i < numBuckets; i++) {
        if (leftTailCount < tailDots) {
            leftTailCount += buckets[i];
            leftTailBuckets++;
        }
        if (rightTailCount < tailDots) {
            rightTailCount += buckets[numBuckets - 1 - i];
            rightTailBuckets++;
        }
        if (leftTailCount >= tailDots && rightTailCount >= tailDots) break;
    }
    
    if (values.length > 0) {
        // Calculate and log the 10th and 90th percentile values
        const sortedValues = values.slice().sort((a, b) => a - b);
        const leftPercentileIndex = Math.floor(sortedValues.length * 0.1);
        const rightPercentileIndex = Math.floor(sortedValues.length * 0.9);
        const leftPercentileValue = sortedValues[leftPercentileIndex];
        const rightPercentileValue = sortedValues[rightPercentileIndex];
        console.log('10th percentile:', leftPercentileValue.toFixed(4));
        console.log('90th percentile:', rightPercentileValue.toFixed(4));
    }

    const userBucket = userValue ? Math.min(Math.floor((userValue - min) / bucketSize), numBuckets - 1) : null;
    const bucketsWithoutUser = buckets.map((value, index) => index === userBucket ? value - 1 : value);
    const maxBucket = Math.max(...bucketsWithoutUser) + 1;
    const maxCount = maxBucket + (bucketsWithoutUser[userBucket] === maxBucket ? 1 : 0);

    // Draw gridlines
    const numGridlines = 10;

    // Vertical gridlines
    for (let i = 0; i <= numGridlines; i++) {
        const x = distributionChartMargin.left + (i / numGridlines) * chartWidth;

        outlined(ctx, ctx => {
            ctx.beginPath();
            ctx.moveTo(x, distributionChartMargin.top);
            ctx.lineTo(x, chartHeight + distributionChartMargin.top);
            ctx.stroke();
        });
    }

    // Horizontal gridlines
    for (let i = 0; i <= numGridlines; i++) {
        const y = distributionChartMargin.top + chartHeight - (i / numGridlines) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(distributionChartMargin.left, y);
        ctx.lineTo(distributionChartMargin.left + chartWidth, y);
        ctx.stroke();
    }

    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (values.length - 1);
    const stddev = Math.sqrt(variance);

    // Draw bars
    const barWidth = chartWidth / numBuckets;
    const scaleY = chartHeight / maxCount;
    const calculateColor = newColorCalculator(dots, rChoice, thetaChoice, nChoice, highlightedBar);

    buckets.forEach((count, index) => {
        const x = distributionChartMargin.left + index * barWidth;
        const y = chartHeight + distributionChartMargin.top - count * scaleY;
        const bucketHeight = count * scaleY;

        if (highlightedBar === index || userBucket === index) {
            ctx.fillStyle = 'black';
        } else {
            const dotIndex = dots.findIndex(dot => {
                const value = transform(dot);
                const bucketIndex = Math.min(Math.floor((value - min) / bucketSize), numBuckets - 1);
                return bucketIndex === index;
            });

            if (dotIndex === -1) {
                ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
            } else {
                ctx.fillStyle = calculateColor(dotIndex, true);
            }
        }

        ctx.fillRect(x, y, barWidth - 1, bucketHeight);
    });

    // Draw mean line
    ctx.strokeStyle = 'rgba(255, 0, 0, 1)';
    ctx.lineWidth = 2;
    const meanX = distributionChartMargin.left + ((mean - min) / range) * chartWidth;
    ctx.beginPath();
    ctx.moveTo(meanX, distributionChartMargin.top);
    ctx.lineTo(meanX, chartHeight + distributionChartMargin.top);
    ctx.stroke();

    // Add mean label centered above the mean line
    ctx.fillStyle = 'red';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`μ = ${mean.toFixed(2)}`, meanX, distributionChartMargin.top - 5);

    // Reset font and color for other labels
    ctx.font = '9px Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';

    // Shade the tail regions
    ctx.fillStyle = tailShadeColor;
    ctx.fillRect(distributionChartMargin.left, distributionChartMargin.top, leftTailBuckets * barWidth, chartHeight);
    ctx.fillRect(canvasWidth - distributionChartMargin.right - rightTailBuckets * barWidth, distributionChartMargin.top, rightTailBuckets * barWidth, chartHeight);

    // Draw line indicators for tail regions
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 2;

    // Left tail indicator
    ctx.beginPath();
    ctx.moveTo(distributionChartMargin.left, distributionChartMargin.top + 10);
    ctx.lineTo(distributionChartMargin.left + leftTailBuckets * barWidth, distributionChartMargin.top + 10);
    ctx.stroke();

    // Right tail indicator
    ctx.beginPath();
    ctx.moveTo(canvasWidth - distributionChartMargin.right - rightTailBuckets * barWidth, distributionChartMargin.top + 10);
    ctx.lineTo(canvasWidth - distributionChartMargin.right, distributionChartMargin.top + 10);
    ctx.stroke();

    // Draw red dashed vertical lines to separate tail regions
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(distributionChartMargin.left + leftTailBuckets * barWidth, distributionChartMargin.top);
    ctx.lineTo(distributionChartMargin.left + leftTailBuckets * barWidth, chartHeight + distributionChartMargin.top);
    ctx.moveTo(canvasWidth - distributionChartMargin.right - rightTailBuckets * barWidth, distributionChartMargin.top);
    ctx.lineTo(canvasWidth - distributionChartMargin.right - rightTailBuckets * barWidth, chartHeight + distributionChartMargin.top);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tail labels
    if (leftTailBuckets > 3){
        addBackgroundToText(ctx, leftTailBuckets <= 6 ? '10%' : '10% density', distributionChartMargin.left + (leftTailBuckets * barWidth) / 2, distributionChartMargin.top + 10, 'center', 'middle');
    }
    if (rightTailBuckets > 3) {
        addBackgroundToText(ctx, rightTailBuckets <= 6 ? '10%' : '10% density', canvasWidth - distributionChartMargin.right - (rightTailBuckets * barWidth) / 2, distributionChartMargin.top + 10, 'center', 'middle');
    }

    // Draw axes
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(distributionChartMargin.left, chartHeight + distributionChartMargin.top);
    ctx.lineTo(chartWidth + distributionChartMargin.left, chartHeight + distributionChartMargin.top);
    ctx.moveTo(distributionChartMargin.left, distributionChartMargin.top);
    ctx.lineTo(distributionChartMargin.left, chartHeight + distributionChartMargin.top);
    ctx.stroke();

    // Draw x-axis labels
    ctx.fillStyle = 'black';
    ctx.font = '9px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const numLabels = 10;
    for (let i = 0; i <= numLabels; i++) {
        const value = min + (i / numLabels) * range;
        const x = distributionChartMargin.left + (i / numLabels) * chartWidth;
        ctx.save();
        ctx.translate(x, canvasHeight - distributionChartMargin.bottom + 5);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(value.toFixed(2), 0, 0);
        ctx.restore();
    }

    // Draw y-axis labels
    ctx.fillStyle = 'black';
    ctx.font = '9px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const yAxisSteps = 5;
    for (let i = 0; i <= yAxisSteps; i++) {
        const value = Math.round((i / yAxisSteps) * maxCount);
        const y = chartHeight + distributionChartMargin.top - (i / yAxisSteps) * chartHeight;
        ctx.fillText(value.toString(), distributionChartMargin.left - 10, y);
    }

    // Add axis titles and statistics
    ctx.fillStyle = 'black';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    const nExpr = nChoices[nChoice].expr(rChoice, thetaChoice, userMean, userStddev);
    const statsText = `n = ${nExpr}     σ = ${stddev.toFixed(2)}     σ² = ${variance.toFixed(2)}`;
    ctx.fillText(statsText, canvasWidth / 2, canvasHeight - 15);

    ctx.fillStyle = 'black';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(20, chartHeight / 2 + distributionChartMargin.top);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Frequency', 0, 0);
    ctx.restore();
}

function setupDynamicCanvas(
    $uniformCanvas,
    $polarCanvas,
    $distributionCanvas,
    callback,
) {
    const resizeDistributionCanvas = () => {
        const windowWidth = $(window).width();
        $distributionCanvas.width = (860 <= windowWidth && windowWidth <= 1280) ? $('#canvasContainer').width() : 400;
        callback();
    }

    $uniformCanvas.width = $polarCanvas.width = $distributionCanvas.width = 400;
    $uniformCanvas.height = $polarCanvas.height = $distributionCanvas.height = 400;
    resizeDistributionCanvas();

    let resizeTimeout;
    $(window).on('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeDistributionCanvas, 250);
    });
}

function updateCoordinates(
    $uniformCanvas,
    $polarCanvas,
    $distributionCanvas,
    rChoice, thetaChoice, nChoice,
    { clientX, clientY }, targetCanvas,
) {
    const rect = targetCanvas.getBoundingClientRect();
    const scaleX = targetCanvas.width / rect.width;
    const scaleY = targetCanvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    if (targetCanvas === $uniformCanvas) {
        const { left, right, top, bottom } = uniformChartMargin;
        const chartWidth = targetCanvas.width - left - right;
        const chartHeight = targetCanvas.height - top - bottom;

        if (0 <= x && x <= targetCanvas.width && 0 <= y && y <= targetCanvas.height) {
            return {
                userDot: {
                    u1: Math.max(0, Math.min(1, (x - left) / chartWidth)),
                    u2: Math.max(0, Math.min(1, 1 - (y - top) / chartHeight)),
                },
                highlightedBar: null,
            };
        }
    }

    if (targetCanvas === $polarCanvas) {
        const centerX = targetCanvas.width / 2;
        const centerY = targetCanvas.height / 2;
        const maxRadius = Math.min(targetCanvas.width, targetCanvas.height) / 2 - 60;

        const dx = x - centerX;
        const dy = centerY - y;

        let theta = Math.atan2(dy, dx);
        if (theta < 0) {
            theta += 2 * Math.PI;
        }

        const r = Math.sqrt(dx * dx + dy * dy) / maxRadius * 3;
        const u1 = rChoices[rChoice].inverse(r);
        const u2 = thetaChoices[thetaChoice].inverse(theta);
        if (0 <= u1 && u1 < 1 - epsilon && 0 <= u2 && u2 < 1 - epsilon) {
            return {
                userDot: { u1, u2 },
                highlightedBar: null,
            }
        }
    }

    if (targetCanvas === $distributionCanvas) {
        const { left, right, top, bottom } = distributionChartMargin;
        const chartWidth = targetCanvas.width - left - right;
        const barWidth = chartWidth / numBuckets;

        if (x >= left && x <= targetCanvas.width - right && y >= top && y <= targetCanvas.height - bottom) {
            return {
                userDot: null,
                highlightedBar: Math.floor((x - left) / barWidth),
            };
        }
    }

    return {
        userDot: null,
        highlightedBar: null,
    }
}

function setupCanvasListeners(
    $uniformCanvas,
    $polarCanvas,
    $distributionCanvas,
    choices,
    callback,
) {
    function addCanvasListeners(canvas) {
        let isDrawing = false;

        function startDrawing(event) {
            event.preventDefault();
            isDrawing = true;
            onMove(event);
        }

        function stopDrawing() {
            isDrawing = false;
            callback(null, null);
        }

        function onMove(event) {
            event.preventDefault();
            if (!isDrawing) return;

            const { rChoice, thetaChoice, nChoice } = choices();
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            let clientX, clientY;

            if (event.type.startsWith('touch')) {
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            } else {
                clientX = event.clientX;
                clientY = event.clientY;
            }

            const x = (clientX - rect.left) * scaleX;
            const y = (clientY - rect.top) * scaleY;

            const { userDot, highlightedBar } = updateCoordinates(
                $uniformCanvas,
                $polarCanvas,
                $distributionCanvas,
                rChoice, thetaChoice, nChoice,
                { clientX, clientY }, canvas,
            );

            callback(userDot, highlightedBar);
        }

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('touchstart', startDrawing, { passive: false });

        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('touchmove', onMove, { passive: false });

        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('touchend', stopDrawing);

        canvas.addEventListener('mouseleave', stopDrawing);
        canvas.addEventListener('touchcancel', stopDrawing);

        // Prevent default touch behavior on the canvas and its parent
        canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        canvas.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
        canvas.parentElement.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        canvas.parentElement.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        canvas.parentElement.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
    }

    addCanvasListeners($uniformCanvas);
    addCanvasListeners($polarCanvas);
    addCanvasListeners($distributionCanvas);

    document.addEventListener('mouseup', () => {
        callback(null, null);
    });

    document.addEventListener('touchend', () => {
        callback(null, null);
    });
}

$(document).ready(() => {
    populateSelectOptions();

    const urlParams = new URLSearchParams(window.location.search);
    $('#numDots').val(urlParams.get('numDots') || 5000);
    $('#rChoice').val(urlParams.get('rChoice') || 'sqrtLnU12');
    $('#thetaChoice').val(urlParams.get('thetaChoice') || '2pi');
    $('#nChoice').val(urlParams.get('nChoice') || 'cosThetaR');
    $('#mean').val(urlParams.get('mean') || 0);
    $('#stddev').val(urlParams.get('stddev') || 1);

    if (urlParams.get('hideUniform') === 'true') {
        $('#toggleUniform').prop('checked', false);
        $('#uniformWrapper').toggle();
    }

    if (urlParams.get('hidePolar') === 'true') {
        $('#togglePolar').prop('checked', false);
        $('#polarWrapper').toggle();
    }

    if (urlParams.get('hideDistribution') === 'true') {
        $('#toggleDistribution').prop('checked', false);
        $('#distributionWrapper').toggle();
    }

    let rChoice = $('#rChoice').val();
    let thetaChoice = $('#thetaChoice').val();
    let nChoice = $('#nChoice').val();

    let dots = [];
    let userDot = null;
    let highlightedBar = null;

    const $uniformCanvas = document.getElementById('uniformCanvas');
    const $polarCanvas = document.getElementById('polarCanvas');
    const $distributionCanvas = document.getElementById('distributionCanvas');

    const drawGraphs = () => {
        if (nChoice !== '') {
            drawAllGraphs(
                $uniformCanvas,
                $polarCanvas,
                $distributionCanvas,
                dots, rChoice, thetaChoice, nChoice, userDot, highlightedBar
            );
        } else {
            drawAllGraphs(
                $uniformCanvas,
                $polarCanvas,
                $distributionCanvas,
                dots, rChoice, thetaChoice, nChoice, userDot, null
            );
        }
    };

    $('#rChoice').on('change', () => {
        rChoice = $('#rChoice').val();
        drawGraphs();
    });

    $('#thetaChoice').on('change', () => {
        thetaChoice = $('#thetaChoice').val();
        drawGraphs();
    });

    $('#nChoice').on('change', () => {
        nChoice = $('#nChoice').val();

        if (nChoice === '') {
            $('#distributionControls').hide();
            $('#distributionCanvas').hide();
            $('#noExpressionMessage').show();
        } else {
            $('#distributionControls').show();
            $('#distributionCanvas').show();
            $('#noExpressionMessage').hide();
        }

        drawGraphs();
    });

    setupDynamicCanvas(
        $uniformCanvas,
        $polarCanvas,
        $distributionCanvas,
        drawGraphs,
    );

    setupCanvasListeners(
        $uniformCanvas,
        $polarCanvas,
        $distributionCanvas,
        () => ({ rChoice, thetaChoice, nChoice }),
        (_userDot, _highlightedBar) => {
            if (userDot !== _userDot || highlightedBar !== _highlightedBar) {
                userDot = _userDot;
                highlightedBar = _highlightedBar;
                drawGraphs();
            }
        },
    );

    const generateDots = () => {
        dots = generateUniformDots(parseInt($('#numDots').val(), 10));
    }

    const updateSliderValues = () => {
        $('#numDotsValue').text($('#numDots').val());
        $('#meanValue').text($('#mean').val());
        $('#stddevValue').text($('#stddev').val());
    }

    $('#numDots').on('input', function() {
        updateSliderValues();
        generateDots();
        drawGraphs();
    });

    $('#mean').on('input', function() {
        updateSliderValues();
        drawGraphs();
    });

    $('#stddev').on('input', function() {
        updateSliderValues();
        drawGraphs();
    });

    $('.collapsible-header').click(function() {
        $(this).next('.collapsible-content').slideToggle();
        $(this).find('.toggle-icon').text(function(_, text) {
            return text === '▼' ? '▲' : '▼';
        });
    });

    $('.collapsible-content').show();
    $('.toggle-icon').text('▼');

    const shouldAnimate = urlParams.get('animate') === 'true';

    const rCycleOptionsRaw = urlParams.get('rCycle');
    const thetaCycleOptionsRaw = urlParams.get('thetaCycle');
    const nCycleOptionsRaw = urlParams.get('nCycle');

    const rCycleOptions = (rCycleOptionsRaw || Object.keys(rChoices).join(',')).split(',');
    const thetaCycleOptions = (thetaCycleOptionsRaw || Object.keys(thetaChoices).join(',')).split(',');
    const nCycleOptions = (nCycleOptionsRaw || Object.keys(nChoices).join(',')).split(',');

    if (shouldAnimate) {
        $('#chartToggles').show();
        $('#toggleUniform').on('change', () => $('#uniformWrapper').toggle());
        $('#togglePolar').on('change', () => $('#polarWrapper').toggle());
        $('#toggleDistribution').on('change', () => $('#distributionWrapper').toggle());

        const flash = () => {
            [$uniformCanvas, $polarCanvas, $distributionCanvas].forEach(canvas => {
                const ctx = canvas.getContext('2d');
                ctx.save();
                ctx.fillStyle = 'rgb(255, 0, 0)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
            })
        };

        const animate = () => {
            let currentBar = 0;
            let cycling = true;
            let rCycleIndex = 0;
            let thetaCycleIndex = 0;
            let nCycleIndex = 0;

            setInterval(() => {
                if (cycling && (rCycleOptionsRaw !== '' || thetaCycleOptionsRaw !== '' || nCycleOptionsRaw !== '')) {
                    flash();

                    rChoice = rCycleOptions[rCycleIndex];
                    thetaChoice = thetaCycleOptions[thetaCycleIndex];
                    nChoice = nCycleOptions[nCycleIndex];

                    $('#rChoice').val(rChoice);
                    $('#thetaChoice').val(thetaChoice);
                    $('#nChoice').val(nChoice);

                    nCycleIndex = (nCycleIndex + 1) % nCycleOptions.length;
                    if (nCycleIndex === 0) {
                        thetaCycleIndex = (thetaCycleIndex + 1) % thetaCycleOptions.length;

                        if (thetaCycleIndex === 0) {
                            rCycleIndex = (rCycleIndex + 1) % rCycleOptions.length;
                        }
                    }

                    cycling = false;
                    return;
                }

                highlightedBar = currentBar;
                drawGraphs();
                currentBar = (currentBar + 1) % numBuckets;

                if (currentBar === 0) {
                    cycling = true;
                }
            }, 200);
        };

        let countdownIndex = 10;

        const countdown = () => {
            if (countdownIndex === 0) {
                animate();
            } else {
                countdownIndex--;

                if (countdownIndex % 2 === 0) {
                    flash();
                } else {
                    drawGraphs();
                }

                setTimeout(countdown, 1000);
            }
        };

        countdown();
    }

    updateSliderValues();
    generateDots();
    drawGraphs();
});
