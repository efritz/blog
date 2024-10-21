var STATE_INACTIVE = 1;
var STATE_ACTIVE   = 2;
var STATE_COOLDOWN = 3;

function BTConfig(limit, window, active, cooldown) {
    this.limit = limit;
    this.window = window * 100;
    this.active = active * 100;
    this.cooldown = cooldown * 100;
}

function BurstTier() {
    this.hits = [];
    this.rejections = [];
    this.activePeriods = [];
    this.cooldownPeriods = [];
    this.hitsInWindow = 0;
    this.fallen = 0;
}

BurstTier.prototype.normalize = function(i, config, timestamp) {
    if (i > 0 && this.state(config, timestamp) == STATE_INACTIVE) {
        this.hitsInWindow = 0;
        this.fallen = this.hits.length;
    } else {
        this.trim(config, timestamp);
    }

    // Clean up old active periods and add cooldown periods
    this.activePeriods = this.activePeriods.filter(period => {
        if (period.end === null) {
            return true;
        }
        if (period.end + config.cooldown > timestamp - 3000) {
            // Add cooldown period if it's not already added
            if (!this.cooldownPeriods.some(cp => cp.start === period.end)) {
                this.cooldownPeriods.push({
                    start: period.end,
                    end: period.end + config.cooldown
                });
            }
            return true;
        }
        return false;
    });

    // Clean up old cooldown periods
    this.cooldownPeriods = this.cooldownPeriods.filter(period =>
        period.end > timestamp - 3000
    );

    // Trim hits (to save memory)
    while (this.fallen > 0 && this.hits[0].timestamp < timestamp - 3000) {
        this.fallen--;
        this.hits.shift();
    }

    // Trim rejections (to save memory)
    while (this.rejections.length > 0 && this.rejections[0].timestamp < timestamp - 3000) {
        this.rejections.shift();
    }
}

BurstTier.prototype.enter = function(timestamp) {
    this.activePeriods.push({ start: timestamp, end: null });
}

BurstTier.prototype.state = function(config, timestamp) {
    if (this.activePeriods.length > 0) {
        let lastPeriod = this.activePeriods[this.activePeriods.length - 1];
        if (lastPeriod.end === null) {
            if (timestamp <= lastPeriod.start + config.active) {
                return STATE_ACTIVE;
            } else {
                lastPeriod.end = lastPeriod.start + config.active;
                // Add new cooldown period
                this.cooldownPeriods.push({
                    start: lastPeriod.end,
                    end: lastPeriod.end + config.cooldown
                });
            }
        }
    }
    // Check if in cooldown state
    for (let i = this.cooldownPeriods.length - 1; i >= 0; i--) {
        if (timestamp <= this.cooldownPeriods[i].end) {
            return STATE_COOLDOWN;
        }
    }
    return STATE_INACTIVE;
}

BurstTier.prototype.canHit = function(config, timestamp, maxHits, bottom) {
    if (maxHits > config.limit - this.hitsInWindow) {
        return config.limit - this.hitsInWindow;
    }

    return maxHits;
}

BurstTier.prototype.trim = function(config, timestamp) {
    var edge = timestamp - config.window;

    while (this.fallen < this.hits.length && this.hits[this.fallen].timestamp < edge) {
        this.hitsInWindow -= this.hits[this.fallen++].count;
    }
}

BurstTier.prototype.addHit = function(count, timestamp, id) {
    this.hits.push({
        id: id,
        count: count,
        timestamp: timestamp,
    });

    this.hitsInWindow += count;
}

function RateLog() {
    this.tiers = [];
}

RateLog.prototype.normalize = function(configs, timestamp) {
    while (configs.length < this.tiers.length) {
        this.tiers.pop();
    }

    while (this.tiers.length < configs.length) {
        this.tiers.push(new BurstTier());
    }

    for (var i = 0; i < this.tiers.length; i++) {
        this.tiers[i].normalize(i, configs[i], timestamp);
    }
}

RateLog.prototype.activeTier = function(configs, timestamp) {
    this.normalize(configs, timestamp);

    for (var i = configs.length - 1; i >= 0; i--) {
        if (this.tiers[i].state(configs[i], timestamp) == STATE_ACTIVE) {
            return i;
        }
    }

    return -1;
}

RateLog.prototype.addHit = function(configs, timestamp, minHits, maxHits, id) {
    if (this.tiers.length == 0) {
        return;
    }

    var activeIndex = Math.max(0, this.activeTier(configs, timestamp));

    var dist = [];
    for (var i = activeIndex; maxHits > 0 && i < configs.length; i++) {
        if (this.tiers[i].state(configs[i], timestamp) == STATE_COOLDOWN) {
            break;
        }

        var d = this.tiers[i].canHit(configs[i], timestamp, maxHits, i == 0);

        dist.push(d);
        minHits -= d;
        maxHits -= d;
    }

    if (minHits > 0) {
        return this.tiers[activeIndex].rejections.push({
            id: id,
            timestamp: timestamp
        });
    }

    for (var i = 0, j = activeIndex; i < dist.length; i++, j++) {
        if (this.tiers[j].state(configs[j], timestamp) == STATE_INACTIVE) {
            this.tiers[j].enter(timestamp);
        }

        this.tiers[j].addHit(dist[i], timestamp, id);
    }
}
