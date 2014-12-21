/*jshint browser:true, globalstrict:true */
/*globals $, _, Backbone, ga */

'use strict';

var presets = {
    // Wheel 
    wheel_26: 26,
    wheel_275: 27.5,
    wheel_29: 29,
    
    // Single Ring
    single_28: [28],
    single_30: [30],
    single_32: [32],
    single_34: [34],
    single_36: [36],
    single_38: [38],
    
    // Double Rings
    'double_22_36': [22, 36],
    'double_24_38': [24, 38],
    'double_26_38': [26, 38],
    'double_28_40': [28, 40],
    
    // Triple Rings
    'triple_22_40': [22, 30, 40],
    'triple_22_44': [22, 33, 44],
    'triple_24_42': [24, 32, 42],
    
    // 11 Speed Sprockets
    'sp11_10_42': [10, 12, 14, 16, 18, 21, 24, 28, 32, 36, 42],
    'sp11_11_40': [11, 13, 15, 17, 19, 21, 24, 27, 31, 35, 40],
    
    // 10 Speed Sprockets
    'sp10_11_32': [11, 12, 14, 16, 18, 20, 22, 25, 28, 32],
    'sp10_11_34': [11, 13, 15, 17, 19, 21, 23, 26, 30, 34],
    'sp10_11_36': [11, 13, 15, 17, 19, 21, 24, 28, 32, 36],
    
    // 9 Speed Sprockets
    'sp9_11_32': [11, 12, 14, 16, 18, 21, 24, 28, 32],
    'sp9_11_34': [11, 13, 15, 17, 20, 23, 26, 30, 34],
    'sp9_12_36': [12, 14, 16, 18, 21, 24, 28, 32, 36]
};

var configs = [
    {
        name: 'Standard 2x10',
        wheelSize: 29,
        rings: presets.double_24_38,
        sprockets: presets.sp10_11_36
    },
    {
        name: 'SRAM 1x11',
        wheelSize: 29,
        rings: presets.single_30,
        sprockets: presets.sp11_10_42
    }
];

// UTILITY FUNCTIONS
function clearFocus() {
    document.activeElement.blur();
    window.getSelection().removeAllRanges();
}

function getLabel(value) {
    if (Array.isArray(value)) {
        var result = value[0];
        
        if (value.length === 2 || value.length === 3) {
            result = value.join('/');
        } else if (value.length > 3) {
            result += '-';
            result += value[value.length - 1];
        }
        
        return result;
    }
    
    return value;
}

function sendGAEvent(category, action, label) {
    ga('send', 'event', category, action, label);
}

// MODELS
var Build = Backbone.Model.extend({
    defaults: {
        name: "My Build",
        wheelSize: 29,
        rings: presets.double_24_38,
        sprockets: presets.sp10_11_36
    }
});

var BuildList = Backbone.Collection.extend({
    model: Build
});

// VIEWS
var DropDown = Backbone.View.extend({
    className: 'drop-down-btn',
    
    initialize: function (options) {
        this.opts = options;
        this.isOpen = false;
    },
    open: function () {
        if (!this.isOpen) {
            var self = this;
            var offset = this.$el.offset();
            
            clearFocus();
            
            this.isOpen = true;
            this.$el.addClass('selected');

            // Make the dropdown
            this.$dropdown = $('<div>')
                .addClass('dropdown')
                .appendTo(document.body);
            
            // Fill the content
            this.$dropdown.html(document.getElementById(this.opts.template).innerHTML);            
            this.$dropdown.find('[data-preset]').forEach(function (item) {
                var value = presets[item.dataset.preset];
                item.dataset.value = JSON.stringify(value);
                item.innerHTML = getLabel(value);
            });
            
            // Highlight selected item
            this.$dropdown.find('.dropdown-item').forEach(function (item) {
                if (item.dataset.value == JSON.stringify(self.opts.value)) {
                    item.classList.add('selected');
                }
            });
            
            // Add click handler
            this.$dropdown.on('mousedown .dropdown-item', function (e) {
                e.stopPropagation();
                e.preventDefault();
                
                self.opts.value = JSON.parse(e.target.dataset.value);
                self.close();
                self.render();
                self.trigger('change');
                
                sendGAEvent('dropdown', 'select', e.target.dataset.preset);
            });
            
            // Set the styles and show
            this.$dropdown.css({
                width: this.opts.width,
                top: offset.top + offset.height,
                right: $(document).width() - (offset.left + offset.width),
                opacity: 1
            });
            
            // Make sure it is on screen
            if (this.$dropdown.offset().left < 5) {
                this.$dropdown.css({left: '7px', borderTopRightRadius: '5px'});
            }
            
            this.boundCloseDropdown = this.closeDropDown.bind(this, this);
            document.addEventListener('mousedown', this.boundCloseDropdown, true);
            window.addEventListener('resize', this.boundCloseDropdown);
            
            sendGAEvent('dropdown', 'open', this.opts.template);
        }
    },
    close: function () {
        if (this.isOpen) {
            this.isOpen = false;
            this.$el.removeClass('selected');

            this.$dropdown.remove();
            this.$dropdown = null;
            
            document.removeEventListener('mousedown', this.boundCloseDropdown, true);
            window.removeEventListener('resize', this.boundCloseDropdown);
        }
    },
    toggle: function () {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },
    closeDropDown: function (dropDown, e) {
        if (dropDown && dropDown.close) {
            dropDown.close();
        }
    },
    mouseDownHandler: function (e) {
        if (e.currentTarget.classList &&
            e.currentTarget.classList.contains('drop-down-btn')) {
            this.toggle();
            e.stopPropagation();
            e.preventDefault();
        }
    },
    events: {
        'mousedown': 'mouseDownHandler'
    },
    render: function () {
        var imgSrc = this.opts.imgSrc;
        
        this.$el.html('');
        
        if (imgSrc) {
            $('<img>')
                .addClass('drop-down-btn-img')
                .addClass('semi-trans')
                .attr('src', imgSrc)
                .appendTo(this.$el);
        }
        $('<span>')
            .text(getLabel(this.opts.value))
            .appendTo(this.$el);
        
        return this;
    }
});

var TableView = Backbone.View.extend({
    tagName: 'table',
    
    _makeRow: function (firstItem, data, isHeader) {
        var $row = $('<tr>');
        
        $row.append($('<th>').html(firstItem));
        
        data.forEach(function (item) {
            $row.append($(isHeader ? '<th>' : '<td>').html(item));
        });
        
        return $row;
    },
    render: function () {
        var sprockets   = this.model.get('sprockets').slice().reverse(),
            rings       = this.model.get('rings'),
            wheelSize   = this.model.get('wheelSize');
        
        this.$el = $('<table>');
        this.$el.append(this._makeRow('', sprockets, true));
        
        rings.forEach(function (ring) {
            var data = [];
            sprockets.forEach(function (sprocket) {
                var val = ring /sprocket;       // Ratio
                val *= (wheelSize * Math.PI);   // Convert to distance (inches)
                val /= 12;                      // Convert to feet
                data.push(val.toFixed(1));
            });
            this.$el.append(this._makeRow(ring, data));
        }.bind(this));
        
        return this;
    }
});

var BuildView = Backbone.View.extend({
    tagName: 'div',
    className: 'build',
    
    initialize: function () {
        this.table = new TableView({model: this.model});
        
        this.wheelDropdown = new DropDown({
            template: 'wheel-dropdown',
            width: '3.95em',
            imgSrc: 'img/wheel.svg'
        }).on('change', function () {
            this.model.set('wheelSize', this.wheelDropdown.opts.value);
            this.render();
        }.bind(this));
        
        this.ringDropdown = new DropDown({
            template: 'ring-dropdown',
            width: '21em',
            imgSrc: 'img/ring.svg'
        }).on('change', function () {
            this.model.set('rings', this.ringDropdown.opts.value);
            this.render();
        }.bind(this));
        
        this.sprocketDropdown = new DropDown({
            template: 'sprocket-dropdown',
            width: '25em',
            imgSrc: 'img/sprocket.svg'
        }).on('change', function () {
            this.model.set('sprockets', this.sprocketDropdown.opts.value);
            this.render();
        }.bind(this));
    },
    render: function () {
        this.wheelDropdown.opts.value = this.model.get('wheelSize');
        this.ringDropdown.opts.value = this.model.get('rings');
        this.sprocketDropdown.opts.value = this.model.get('sprockets');
        
        this.$el.html(document.getElementById('build-template').innerHTML);
        
        this.$el.find('.name')
            .val(this.model.get('name'))
            .on('keydown', function (e) {
                if (e.keyCode === 27) { // esc key
                    e.target.value = this.model.get('name');
                }
                if (e.keyCode === 27 || e.keyCode === 13) {
                    clearFocus();
                }
            }.bind(this))
            .on('blur', function (e) {
                this.model.set('name', e.target.value);
                sendGAEvent('build', 'rename');
            }.bind(this));
                   
        this.$el.find('.config')
            .append(this.wheelDropdown.render().$el)
            .append(this.ringDropdown.render().$el)
            .append(this.sprocketDropdown.render().$el);
        
        this.table.render();
        this.$el.append(this.table.$el);
        
        return this;
    }
});

var BuildListView = Backbone.View.extend({
    el: $('#build-list'),
    
    render: function () {
        this.$el.html('');
        
        this.collection.forEach(function (item) {
            var view = new BuildView({model: item}).render();
            this.$el.append(view.el);
        }.bind(this));
        
        $('<a>')
            .html('New Build')
            .addClass('btn')
            .addClass('text-shadow')
            .addClass('btn-new-build')
            .click(function () {
                this.collection.add(new Build());
                this.render();
                sendGAEvent('build', 'create');
            }.bind(this))
            .appendTo(this.$el);
    }
});

var buildList = new BuildList();
configs.forEach(function (config) {
    buildList.add(new Build(config));
});

new BuildListView({collection: buildList}).render();