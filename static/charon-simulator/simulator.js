var configs = [];
var ratelog = new RateLog();

function addRow(limit, window, active, cooldown) {
    var row = $('<tr />');
    row.append($('<td />').append($('<input type="number" class="form-control form-control-sm" min="0" value="' + limit + '">')));
    row.append($('<td />').append($('<input type="number" class="form-control form-control-sm" min="0" value="' + window + '">')));
    row.append($('<td />').append($('<input type="number" class="form-control form-control-sm" min="0" value="' + active + '">')));
    row.append($('<td />').append($('<input type="number" class="form-control form-control-sm" min="0" value="' + cooldown + '">')));

    var deleter = $('<button type="button" class="btn btn-sm btn-danger">');
    deleter.append($('<span class="delete fa fa-trash"></span>'));
    deleter.click(onDelete);
    row.append($('<td />').append(deleter));
    $('#tiers tbody').append(row);
    row.find('input').change(validateConfig);
    validateConfig();
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
        configs.push(new BTConfig(...$(c).find('input').map(function(i, v) {
            return $(v).val();
        })));
    });

    configUpdated();
}

function onDelete(event) {
    $(event.target).parent().parent().remove();
    validateConfig();
}

function applyHit() {
    ratelog.addHit(configs, Date.now() / 10, parseInt($('#min-hits').val()), parseInt($('#max-hits').val()));
}

$(document).ready(function() {
    $('#hit').click(applyHit);

    $('#add').click(function() {
        addRow(5, 5, 5, 0);
    });

    $('.delete').click(onDelete);
    $('#tiers input').change(validateConfig);

    loadInitialTiers();
    validateConfig();
});

$(document).ready(function() {
    $(document).keyup(function(event) {
        if (event.keyCode == 32) {
            applyHit();
        }
    });

    setInterval(function() {
        draw($('#canvas'), Date.now() / 10, ratelog, configs);
    }, 30);
});
