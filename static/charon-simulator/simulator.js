var configs = [];
var ratelog = new RateLog();

function addRow(limit, window, active, cooldown) {
    var row = $('<tr />');
    var tierCell = $('<td class="tier-number"></td>');
    var tierWrapper = $('<div class="tier-wrapper"></div>');
    var tierNumber = $('<span class="tier-text"></span>');
    var deleter = $('<span class="delete fa fa-trash"></span>');
    deleter.click(onDelete);
    tierWrapper.append(tierNumber).append(deleter);
    tierCell.append(tierWrapper);
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
            if (format === 'ns') {
                // Update limit label when window changes
                var row = $(this).closest('tr');
                updateSliderLabel(row.find('input[type="range"]:eq(0)'), 'n/s');
            }
            validateConfig();
        });
        return cell;
    }

    row.append(createSliderCell(limit, 1, 1000, 1, 'n/s'));
    row.append(createSliderCell(window, 1, 3600, 1, 'ns'));
    row.append(createSliderCell(active, 1, 3600, 1, 'ns'));
    row.append(createSliderCell(cooldown, 0, 3600, 1, 'ns')); // Changed min value to 0 for cooldown

    $('#tiers tbody').append(row);
    row.find('input[type="range"]').each(function() {
        updateSliderLabel($(this), $(this).closest('td').index() === 1 ? 'n/s' : 'ns');
    });
    updateTierNumbers();
    validateConfig();
}

function updateSliderLabel(slider, format) {
    var value = parseInt(slider.val());
    var label = slider.siblings('.label-wrapper').find('.slider-label');
    if (format === 'n/s') {
        var row = slider.closest('tr');
        var windowValue = parseInt(row.find('input[type="range"]:eq(1)').val());
        label.text(value + ' per ' + formatTime(windowValue));
    } else {
        label.text(formatTime(value));
    }
}

function formatTime(value) {
    if (value < 60) {
        return value + 's';
    } else if (value < 3600) {
        var minutes = Math.floor(value / 60);
        var seconds = value % 60;
        if (seconds === 0) {
            return minutes + 'm';
        } else {
            return minutes + 'm' + seconds + 's';
        }
    } else {
        var hours = Math.floor(value / 3600);
        var remainingMinutes = Math.floor((value % 3600) / 60);
        if (remainingMinutes === 0) {
            return hours + 'h';
        } else {
            return hours + 'h' + remainingMinutes + 'm';
        }
    }
}

function loadInitialTiers() {
    var str = new RegExp('[?&]tiers=([^&#]*)', 'i').exec(window.location.href);
    var tiersAdded = false;

    if (str) {
        var values = str[1].split(',');
        if (values.length % 4 === 0) {
            var allValid = values.every(function(value) {
                return !isNaN(parseInt(value));
            });

            if (allValid) {
                for (var i = 0; i < values.length; i += 4) {
                    addRow(values[i], values[i+1], values[i+2], values[i+3]);
                }
                tiersAdded = true;
            }
        }
    }

    if (!tiersAdded) {
        // Add default tier
        addRow(5, 1, 1, 0);
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
    updateAddButton();
}

function updateAddButton() {
    var tierCount = $('#tiers tbody tr').length;
    var addButton = $('#add');
    if (tierCount >= 4) {
        addButton.prop('disabled', true);
        addButton.html('No more than four tiers allowed');
    } else {
        addButton.prop('disabled', false);
        addButton.html('<i class="fas fa-plus-circle"></i> Add New Tier');
    }
}

function onDelete(event) {
    var $rows = $('#tiers tbody tr');
    if ($rows.length > 1) {
        $(event.target).closest('tr').remove();
        updateTierNumbers();
        validateConfig();
        resizeCanvas();
        updateAddButton();
    }
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
    var $rows = $('#tiers tbody tr');
    $rows.each(function(index) {
        $(this).find('.tier-text').text('Tier #' + (index + 1));
        var $deleteIcon = $(this).find('.delete');
        if ($rows.length === 1) {
            $deleteIcon.hide();
        } else {
            $deleteIcon.show();
        }
    });
}

$(document).ready(function() {
    $('#hit').click(applyHit);
    $('#add').click(onAdd);
    $('.delete').click(onDelete);
    $('#tiers').on('input', 'input[type="range"]', validateConfig);
    updateAddButton(); // Call this to set the initial state of the button

    // Add collapsible functionality
    $('.collapsible-header').click(function() {
        $(this).next('.collapsible-content').slideToggle();
        $(this).find('.toggle-icon').text(function(_, text) {
            return text === '▼' ? '▲' : '▼';
        });
    });

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

    // Initially expand the sections
    $('.collapsible-content').show();
    $('.toggle-icon').text('▼');
});
