var configs = [];
var ratelog = new RateLog();

function addRow(limit, window, active, cooldown) {
    var row = $('<tr />');
    var tierCell = $('<td class="tier-number"></td>');
    var tierNumber = $('<span class="tier-text"></span>');
    var deleter = $('<span class="delete fa fa-trash"></span>');
    deleter.click(onDelete);
    tierCell.append(tierNumber).append(deleter);
    row.append(tierCell);

    function createSliderCell(value, min, max, step, format) {
        var cell = $('<td />');
        var wrapper = $('<div class="slider-wrapper"></div>');
        var labelWrapper = $('<div class="label-wrapper"></div>');
        var label = $('<span class="slider-label"></span>');
        var slider = $('<input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '">');
        labelWrapper.append(label);
        wrapper.append(labelWrapper).append(slider);
        cell.append(wrapper);
        
        // Set initial label text
        updateSliderLabel(slider, format);
        
        slider.on('input', function() {
            updateSliderLabel($(this), format);
            validateConfig();
        });
        return cell;
    }

    row.append(createSliderCell(limit, 1, 1000, 1, 'n/s'));
    row.append(createSliderCell(window, 1, 3600, 1, 'ns'));
    row.append(createSliderCell(active, 1, 3600, 1, 'ns'));
    row.append(createSliderCell(cooldown, 1, 3600, 1, 'ns'));

    $('#tiers tbody').append(row);
    row.find('input[type="range"]').each(function() {
        updateSliderLabel($(this), $(this).closest('td').index() === 1 ? 'n/s' : 'ns');
    });
    updateTierNumbers();
    validateConfig();
}

function updateSliderLabel(slider, format) {
    var value = slider.val();
    var label = slider.siblings('.label-wrapper').find('.slider-label');
    if (format === 'n/s') {
        label.text(value + '/s');
    } else {
        label.text(value + 's');
    }
}

function loadInitialTiers() {
    var str = new RegExp('[?&]tiers=([^&#]*)', 'i').exec(window.location.href);

    if (str) {
        var values = str[1].split(',');
        if (values.length % 4 != 0) {
            return;
        }

        for (var i = 0; i < values.length; i++) {
            if (isNaN(parseInt(values[i]))) {
                return;
            }
        }

        for (var i = 0; i < values.length; i += 4) {
            addRow(values[i], values[i+1], values[i+2], values[i+3]);
        }
    }
}

function validateConfig() {
    configs = [];
    $('#tiers tbody tr').each(function(i, c) {
        configs.push(new BTConfig(...$(c).find('input[type="range"]').map(function(i, v) {
            return $(v).val();
        })));
    });

    configUpdated();
}

function onAdd() {
    addRow(5, 5, 5, 0);
    resizeCanvas();
    validateConfig();
}

function onDelete(event) {
    $(event.target).closest('tr').remove();
    updateTierNumbers();
    validateConfig();
    resizeCanvas();
}

function applyHit() {
    var requestType = $('input[name="request-type"]:checked').val();
    var minHits, maxHits;

    if (requestType === 'single') {
        minHits = maxHits = 1;
    } else {
        var sliderValues = $('#hits-slider').slider('values');
        minHits = sliderValues[0];
        maxHits = sliderValues[1];
    }

    ratelog.addHit(configs, Date.now() / 10, minHits, maxHits);
}

function updateTierNumbers() {
    $('#tiers tbody tr').each(function(index) {
        $(this).find('.tier-text').text('Tier #' + (index + 1));
    });
}

$(document).ready(function() {
    $('#hit').click(applyHit);
    $('#add').click(onAdd);
    $('.delete').click(onDelete);
    $('#tiers').on('input', 'input[type="range"]', validateConfig);

    loadInitialTiers();
    updateTierNumbers();
    validateConfig();
    resizeCanvas();

    // Initialize the slider
    $('#hits-slider').slider({
        range: true,
        min: 1,
        max: 20,
        values: [1, 5],
        slide: function(event, ui) {
            $('#min-hits-value').text(ui.values[0]);
            $('#max-hits-value').text(ui.values[1]);
            $('input[name="request-type"][value="batch"]').next().html('Make between ' + ui.values[0] + ' and ' + ui.values[1] + ' requests');
        }
    });

    // Handle radio button changes
    $('input[name="request-type"]').change(function() {
        if ($(this).val() === 'single') {
            $('#batch-controls').hide();
        } else {
            $('#batch-controls').show();
        }
    });

    // Initialize batch request label
    $('input[name="request-type"][value="batch"]').next().html('Make between 1 and 5 requests');
});

$(document).ready(function() {
    $(document).keydown(function(event) {
        if (event.keyCode == 32) {
            event.preventDefault();
            applyHit();
        }
    });

    setInterval(function() {
        draw($('#canvas'), Date.now() / 10, ratelog, configs);
    }, 30);
});
