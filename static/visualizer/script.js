$(document).ready(() => {
    let dots = [];
    let userDot = null;

    const $uniformCanvas = document.getElementById('uniformCanvas');
    const $polarCanvas = document.getElementById('polarCanvas');
    const $distributionCanvas = document.getElementById('distributionCanvas');

    $uniformCanvas.width = $polarCanvas.width = $distributionCanvas.width = 400;
    $uniformCanvas.height = $polarCanvas.height = $distributionCanvas.height = 400;

    //
    //

    function drawGraphs() {
        drawUniformDots($uniformCanvas, $uniformCanvas.getContext('2d'));
        drawPolarDots($polarCanvas, $polarCanvas.getContext('2d'));
        drawDistributionChart($distributionCanvas, $distributionCanvas.getContext('2d'));
    }

    function drawUniformDots($canvas, ctx) {
        const margin = { top: 20, right: 20, bottom: 40, left: 40 };
        const canvasWidth = $canvas.width;
        const canvasHeight = $canvas.height;
        const chartWidth = canvasWidth - margin.left - margin.right;
        const chartHeight = canvasHeight - margin.top - margin.bottom;
        const gridlineStep = chartWidth / 10;

        //
        // Clear the canvas

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        //
        // Draw gridlines

        ctx.save();
        ctx.translate(margin.left, margin.top);
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.7)';
        ctx.lineWidth = 0.5;
        
        for (let i = gridlineStep; i < chartWidth; i += gridlineStep) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, chartHeight);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(chartWidth, i);
            ctx.stroke();
        }
        
        ctx.restore();

        //
        // Draw dots
        
        ctx.fillStyle = 'rgba(0, 0, 255, 0.75)';

        dots.forEach(dot => {
            const x = margin.left + dot.u1 * chartWidth;
            const y = canvasHeight - margin.bottom - dot.u2 * chartHeight;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, 2 * Math.PI);
            ctx.fill();
        });

        //
        // Draw user dot in red

        if (userDot) {
            const x = margin.left + userDot.u1 * chartWidth;
            const y = margin.top + (1 - userDot.u2) * chartHeight;

            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }

        //
        // Draw axes

        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(margin.left, canvasHeight - margin.bottom);
        ctx.lineTo(canvasWidth - margin.right, canvasHeight - margin.bottom);
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, canvasHeight - margin.bottom);
        ctx.stroke();

        //
        // Draw x-axis labels

        ctx.fillStyle = 'black';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let i = 0; i <= 10; i++) {
            const x = margin.left + (i / 10) * chartWidth;
            const label = (i / 10).toFixed(1);
            ctx.fillText(label, x, canvasHeight - margin.bottom + 5);
        }

        //
        // Draw y-axis labels

        ctx.fillStyle = 'black';
        ctx.font = '9px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i <= 10; i++) {
            const y = canvasHeight - margin.bottom - (i / 10) * chartHeight;
            const label = (i / 10).toFixed(1);
            ctx.fillText(label, margin.left - 5, y);
        }

        //
        // Draw legends

        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('U1', canvasWidth / 2, canvasHeight - 15);
        ctx.save();
        ctx.translate(15, canvasHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('U2', 0, 0);
        ctx.restore();
    }

    function drawPolarDots($canvas, ctx) {
        const fullWidth = $canvas.width;
        const fullHeight = $canvas.height;
        const centerX = fullWidth / 2;
        const centerY = fullHeight / 2;
        const maxRadius = Math.min(fullWidth, fullHeight) / 2 - 60;

        //
        // Clear the canvas

        ctx.clearRect(0, 0, fullWidth, fullHeight);

        //
        // Draw circular gridlines

        ctx.strokeStyle = 'rgba(100, 100, 100, 0.7)';
        ctx.lineWidth = 0.5;

        for (let r = maxRadius / 3; r <= maxRadius * (3.5 / 3); r += maxRadius / 3) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
            ctx.stroke();
        }

        //
        // Draw radial lines

        ctx.strokeStyle = 'rgba(100, 100, 100, 0.7)';
        ctx.lineWidth = 0.5;

        for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 6) {
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + maxRadius * (3.5 / 3) * Math.cos(angle), centerY - maxRadius * (3.5 / 3) * Math.sin(angle));
            ctx.stroke();
        }

        //
        // Draw dots

        ctx.fillStyle = 'rgba(0, 0, 255, 0.75)';

        dots.forEach(dot => {
            const theta = 2 * Math.PI * dot.u2;
            const r = Math.sqrt(-2 * Math.log(1 - dot.u1));
            const x = centerX + r * Math.cos(theta) * maxRadius / 3;
            const y = centerY - r * Math.sin(theta) * maxRadius / 3;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, 2 * Math.PI);
            ctx.fill();
        });

        //
        // Draw the last drawn dot in red

        if (userDot) {
            const theta = 2 * Math.PI * userDot.u2;
            const r = Math.sqrt(-2 * Math.log(1 - userDot.u1));
            const x = centerX + r * Math.cos(theta) * maxRadius / 3;
            const y = centerY - r * Math.sin(theta) * maxRadius / 3;

            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }

        //
        // Add angle labels

        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        [
            { angle: 0, label: '0' },
            { angle: Math.PI / 2, label: 'π/2' },
            { angle: Math.PI, label: 'π' },
            { angle: 3 * Math.PI / 2, label: '3π/2' }
        ].forEach(({ angle, label }) => {
            const x = centerX + Math.cos(angle) * (maxRadius * (3.5 / 3) + 20);
            const y = centerY - Math.sin(angle) * (maxRadius * (3.5 / 3) + 20);
            ctx.fillText(label, x, y);
        });

        //
        // Add r labels

        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        for (let i = 1; i <= 3; i++) {
            const x = centerX + (i * maxRadius / 3) + 5;
            const y = centerY + 5;
            ctx.fillText(i.toString(), x, y);
        }

    }

    const transform = (dot, mean, stddev) => {
        const theta = 2 * Math.PI * dot.u2;
        const r = Math.sqrt(-2 * Math.log(1 - dot.u1));
        const normalRand = r * Math.cos(theta);
        return (normalRand * stddev) + mean;
    };

    function drawDistributionChart($canvas, ctx) {
        const margin = { top: 20, right: 20, bottom: 60, left: 60 };
        const canvasWidth = $canvas.width;
        const canvasHeight = $canvas.height;
        const chartWidth = canvasWidth - margin.left - margin.right;
        const chartHeight = canvasHeight - margin.top - margin.bottom;

        const mean = parseFloat($('#mean').val());
        const stddev = parseFloat($('#stddev').val());
        const cushion = 4;
        const doTransform = (dot) => transform(dot, mean, stddev);
        
        //
        // Calculate histogram
        
        const rThetaValues = dots.map(doTransform);

        let userValue = null;
        if (userDot) {
            userValue = doTransform(userDot);
            rThetaValues.push(userValue);
        }

        const symmetricMin = mean - cushion * stddev;
        const symmetricMax = mean + cushion * stddev;
        const range = symmetricMax - symmetricMin;
        const numBuckets = 50;
        const bucketSize = range / numBuckets;

        const buckets = new Array(numBuckets).fill(0);
        rThetaValues.forEach(value => {
            const bucketIndex = Math.min(Math.floor((value - symmetricMin) / bucketSize), numBuckets - 1);
            buckets[bucketIndex]++;
        });

        const userBucket = userValue ? Math.min(Math.floor((userValue - symmetricMin) / bucketSize), numBuckets - 1) : null;
        const bucketsWithoutUser = buckets.map((value, index) => index === userBucket ? value - 1 : value);
        const maxBucket = Math.max(...bucketsWithoutUser) + 1;
        const maxCount = maxBucket + (bucketsWithoutUser[userBucket] === maxBucket ? 1 : 0);
        
        //
        // Clear the canvas

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        //
        // Draw gridlines

        const numGridlines = 10;

        ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.lineWidth = 0.5;
        
        // Vertical gridlines
        for (let i = 0; i <= numGridlines; i++) {
            const x = margin.left + (i / numGridlines) * chartWidth;
            ctx.beginPath();
            ctx.moveTo(x, margin.top);
            ctx.lineTo(x, chartHeight + margin.top);
            ctx.stroke();
        }

        // Horizontal gridlines
        for (let i = 0; i <= numGridlines; i++) {
            const y = margin.top + chartHeight - (i / numGridlines) * chartHeight;
            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(margin.left + chartWidth, y);
            ctx.stroke();
        }

        // Draw mean line
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        const meanX = margin.left + ((mean - symmetricMin) / range) * chartWidth;
        ctx.beginPath();
        ctx.moveTo(meanX, margin.top);
        ctx.lineTo(meanX, chartHeight + margin.top);
        ctx.stroke();

        // Add mean label at the top of the graph
        ctx.fillStyle = 'red';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('μ = ' + mean.toFixed(2), meanX, margin.top - (margin.top / 3));
        
        // Reset font and color for other labels
        ctx.font = '9px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';

        //
        // Draw bars

        const barWidth = chartWidth / numBuckets;
        const scaleY = chartHeight / maxCount;
        
        buckets.forEach((count, index) => {
            const x = margin.left + index * barWidth;
            const y = chartHeight + margin.top - count * scaleY;
            const bucketHeight = count * scaleY;

            if (userBucket === index) {
                ctx.fillStyle = 'rgb(255, 0, 0)';
            } else {
                ctx.fillStyle = 'rgb(0, 0, 255)';
            }

            ctx.fillRect(x, y, barWidth - 1, bucketHeight);
        });

        //
        // Draw axes

        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(margin.left, chartHeight + margin.top);
        ctx.lineTo(chartWidth + margin.left, chartHeight + margin.top);
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, chartHeight + margin.top);
        ctx.stroke();

        //
        // Draw x-axis labels

        ctx.fillStyle = 'black';
        ctx.font = '9px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const numLabels = 10;
        for (let i = 0; i <= numLabels; i++) {
            const value = symmetricMin + (i / numLabels) * range;
            const x = margin.left + (i / numLabels) * chartWidth;
            ctx.save();
            ctx.translate(x, canvasHeight - margin.bottom + 5);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(value.toFixed(2), 0, 0);
            ctx.restore();
        }

        //
        // Draw y-axis labels

        ctx.fillStyle = 'black';
        ctx.font = '9px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const yAxisSteps = 5;
        for (let i = 0; i <= yAxisSteps; i++) {
            const value = Math.round((i / yAxisSteps) * maxCount);
            const y = chartHeight + margin.top - (i / yAxisSteps) * chartHeight;
            ctx.fillText(value.toString(), margin.left - 10, y);
        }

        //
        // Add axis titles

        ctx.fillStyle = 'black';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Normal value', chartWidth / 2 + margin.left, canvasHeight - 15);

        ctx.fillStyle = 'black';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(20, chartHeight / 2 + margin.top);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Frequency', 0, 0);
        ctx.restore();

    }

    //
    //

    function updateCoordinates(event) {
        const margin = { top: 20, right: 20, bottom: 40, left: 40 };
        const chartWidth = $uniformCanvas.width - margin.left - margin.right;
        const chartHeight = $uniformCanvas.height - margin.top - margin.bottom;

        const rect = $uniformCanvas.getBoundingClientRect();
        const scaleX = $uniformCanvas.width / rect.width;
        const scaleY = $uniformCanvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        if (0 <= x && x <= $uniformCanvas.width && 0 <= y && y <= $uniformCanvas.height) {
            userDot = { 
                u1: Math.max(0, Math.min(1, (x - margin.left) / chartWidth)),
                u2: Math.max(0, Math.min(1, 1 - (y - margin.top) / chartHeight)),
            };
        } else {
            userDot = null;
        }

        drawGraphs();
    }

    $uniformCanvas.addEventListener('mousedown', () => {
        $(document).on('mousemove', updateCoordinates);
    });

    $(document).on('mouseup', () => {
        $(document).off('mousemove', updateCoordinates);
        userDot = null;
        drawGraphs();
    });

    $uniformCanvas.addEventListener('mouseleave', () => {
        userDot = null;
        drawGraphs();
    });

    //
    //

    function generateUniformDots(n) {
        const dots = [];
        for (let i = 0; i < n; i++) {
            dots.push({ u1: Math.random(), u2: Math.random() });
        }

        return dots;
    }

    function generateAndDrawDots() {
        const n = parseInt($('#numDots').val(), 10);
        if (n > 0) {
            dots = generateUniformDots(n);
            drawGraphs();
        } else {
            alert('Please enter a positive number of dots.');
        }
    }

    function updateSliderValue(sliderId, valueId) {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);
        valueDisplay.textContent = slider.value;
    }

    function updateStdDevRange() {
        const meanValue = Math.abs(parseFloat($('#mean').val()));
        const stddevSlider = document.getElementById('stddev');
        const newMax = Math.max(meanValue / 2, 0.1);
        stddevSlider.max = newMax.toFixed(1);
        
        if (parseFloat(stddevSlider.value) > newMax) {
            stddevSlider.value = newMax.toFixed(1);
            updateSliderValue('stddev', 'stddevValue');
        }
    }

    $('#numDots').on('input', () => {
        updateSliderValue('numDots', 'numDotsValue');
        generateAndDrawDots();
    });

    $('#mean').on('input', () => {
        updateSliderValue('mean', 'meanValue');
        updateStdDevRange();
        drawGraphs();
    });

    $('#stddev').on('input', () => {
        updateSliderValue('stddev', 'stddevValue');
        drawGraphs();
    });

    // Initialize slider values
    updateSliderValue('numDots', 'numDotsValue');
    updateSliderValue('mean', 'meanValue');
    updateStdDevRange();
    updateSliderValue('stddev', 'stddevValue');

    generateAndDrawDots();
});
