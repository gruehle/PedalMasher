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

var units = 'feet';

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
    ga('send', 'event', category, action, label || 'none');
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
            
            // Fill the custom settings (if present)
            this.$dropdown.find('.dropdown-input').forEach(function (item, i) {
                item.value = self.opts.value[i] || '';
            });
            
            // Highlight selected item
            this.$dropdown.find('.dropdown-item').forEach(function (item) {
                if (item.dataset.value == JSON.stringify(self.opts.value)) {
                    item.classList.add('selected');
                }
            });
            if (this.$dropdown.find('.dropdown-item.selected').length === 0) {
                this.$dropdown.find('.dropdown-custom-row').addClass('selected');
            }
            
            // Add click handler for items
            this.$dropdown.on('click', '.dropdown-item', function (e) {
                e.stopPropagation();
                e.preventDefault();

                self.opts.value = JSON.parse(e.target.dataset.value);
                self.isCustomValue = false;
                self.close();
                self.render();
                self.trigger('change');

                sendGAEvent('dropdown', 'select', e.target.dataset.preset);
            });
            
            // Add handlers for custom inputs
            this.$dropdown
                .on('click', '.dropdown-input', function (e) {
                    // Unselect any items
                    self.$dropdown.find('.dropdown-item').removeClass('selected');
                    self.$dropdown.find('.dropdown-custom-row').addClass('selected');
                    self.isCustomValue = true;
                    e.target.setSelectionRange(0, e.target.value.length);
                })
                .on('keydown', '.dropdown-input', function (e) {
                    if (e.keyCode === 27) {
                        self.isCustomValue = false;
                    }
                    if (e.keyCode === 13 || e.keyCode === 27) {
                        self.close();
                    }
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
            document.addEventListener('click', this.boundCloseDropdown, true);
            window.addEventListener('resize', this.boundCloseDropdown);
            
            sendGAEvent('dropdown', 'open', this.opts.template);
        }
    },
    close: function () {
        if (this.isOpen) {
            this.isOpen = false;
            this.$el.removeClass('selected');

            if (this.isCustomValue) {
                var newValue = [];
                this.$dropdown.find('.dropdown-input').forEach(function (item) {
                    if (item.value) {
                        var val = parseInt(item.value);
                        
                        if (val < 8) val = 8;
                        if (val > 60) val = 60;
                        
                        newValue.push(val);
                    }
                });
                newValue.sort(function (a, b) {return a - b;});
                this.opts.value = newValue;
                this.render();
                this.trigger('change');

                sendGAEvent('dropdown', 'select', newValue);
           }
            
            this.$dropdown.remove();
            this.$dropdown = null;
            
            document.removeEventListener('click', this.boundCloseDropdown, true);
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
        if (e && (this.$el.get(0).contains(e.target) || this.$dropdown.get(0).contains(e.target))) {
            return;
        }
        
        if (dropDown && dropDown.close) {
            dropDown.close();
        }
    },
    clickHandler: function (e) {
        if (e.currentTarget.classList &&
            e.currentTarget.classList.contains('drop-down-btn')) {
            this.toggle();
            e.stopPropagation();
            e.preventDefault();
        }
    },
    events: {
        'click': 'clickHandler'
    },
    render: function () {        
        this.$el.html('');
        
        if (this.opts.imgIndex) {
            $('<div>')
                .addClass('sprite')
                .addClass('drop-down-btn-img')
                .addClass('semi-trans')
                .css({backgroundPosition: '-' + this.opts.imgIndex + '00% 0'})
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
                var resolution = 1;
                val *= (wheelSize * Math.PI);   // Convert to distance (inches)
                if (units === 'feet') {
                    val /= 12;                      // Convert to feet
                } else {
                    val /= 39.37;                   // Convert to meters
                    resolution = 2;                 // Meters show 2 digits
                }
                data.push(val.toFixed(resolution));
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
            imgIndex: 1
        }).on('change', function () {
            this.model.set('wheelSize', this.wheelDropdown.opts.value);
            this.render();
        }.bind(this));
        
        this.ringDropdown = new DropDown({
            template: 'ring-dropdown',
            width: '21em',
            imgIndex: 2
        }).on('change', function () {
            this.model.set('rings', this.ringDropdown.opts.value);
            this.render();
        }.bind(this));
        
        this.sprocketDropdown = new DropDown({
            template: 'sprocket-dropdown',
            width: '22em',
            imgIndex: 3
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
    
    showDeleteDialog: function () {
        var $overlay = $('.modal-overlay'),
            $dlg = $('.delete-dlg'),
            $list = $('.delete-dlg-list'),
            $deleteBtn = $('.delete-dlg-delete-btn');
        
        $overlay.show();
        $dlg.show();
        
        var btnHandler = function (e) {
            $dlg.find('.btn').off('click', btnHandler);
            $dlg.hide();
            $overlay.hide();
            document.body.classList.remove('no-scroll');
            
            if (e.target.text === 'Cancel') {
                return;
            }
            
            var itemsToRemove = [];
            $('.delete-dlg-list-item').forEach(function (item, idx) {
                if (item.classList.contains('selected')) {
                    itemsToRemove.push(idx);
                }
            });
            if (itemsToRemove.length) {
                itemsToRemove.reverse();
                
                itemsToRemove.forEach(function (item) {
                    this.collection.remove(this.collection.at(item));
                    sendGAEvent('build', 'delete', item.name);
                }.bind(this));
                
                this.render();
            }
        }.bind(this);
        
        var updateButtonState = function () {
            $deleteBtn.addClass('disabled');
            $('.delete-dlg-list-item').forEach(function (item) {
                if (item.classList.contains('selected')) {
                    $deleteBtn.removeClass('disabled');
                }
            });
        };
        
        $dlg.find('.btn').on('click', btnHandler);
        
        $list.html('');
        this.collection.forEach(function (item) {
            var label = item.get('name');
            
            label += ' <span class="delete-item-desc">(' +
                getLabel(item.get('wheelSize')) + '", ' +
                getLabel(item.get('rings')) + ', ' +
                getLabel(item.get('sprockets')) + ')</span>';
            
            $('<li>')
                .addClass('delete-dlg-list-item')
                .html(label)
                .click(function (e) {
                    $(e.target).toggleClass('selected');
                    updateButtonState();
                })
                .appendTo($list);
        });
        
        document.body.classList.add('no-scroll');
        updateButtonState();
    },
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
            .addClass('action-btn')
            .addClass('btn-new-build')
            .click(function () {
                this.collection.add(new Build());
                this.render();
                sendGAEvent('build', 'create');
            }.bind(this))
            .appendTo(this.$el);
        
        $('<a>')
            .html('Delete...')
            .addClass('btn')
            .addClass('text-shadow')
            .addClass('action-btn')
            .addClass('btn-delete-build')
            .click(function () {
                this.showDeleteDialog();
            }.bind(this))
            .appendTo(this.$el);
        
        return this;
    }
});

// Make build models and views
var buildList = new BuildList();
var items = configs;
if (localStorage.getItem('configs')) {
    try {
        items = JSON.parse(localStorage.getItem('configs'));
    } catch (e) {
        // Ignore errors. Will fall back to default configs.
    }
}
items.forEach(function (config) {
    buildList.add(new Build(config));
});
buildList.on('change add remove', function () {
    localStorage.setItem('configs', JSON.stringify(buildList));
});

// Distance units
var feetBtn = document.getElementById('feet'),
    metersBtn = document.getElementById('meters');

if (localStorage.getItem('units')) {
    units = localStorage.getItem('units');
}
function updateDistanceButtons() {
    feetBtn.checked = units === 'feet';
    metersBtn.checked = units !== 'feet';
}
function distanceBtnClickHandler(e) {
    var newUnits = e.target === feetBtn ? 'feet' : 'meters';
    if (newUnits !== units) {
        units = newUnits;
        updateDistanceButtons();
        buildListView.render();
        localStorage.setItem('units', units);
        sendGAEvent('units', units);
    }
}
feetBtn.addEventListener('click', distanceBtnClickHandler);
metersBtn.addEventListener('click', distanceBtnClickHandler);
updateDistanceButtons();

var buildListView = new BuildListView({collection: buildList}).render();

// Resize handler to update footer positioning
function handleResize(e) {
    var content = document.getElementById('content');
    content.style.minHeight = (window.innerHeight - content.getBoundingClientRect().top) + 'px';
}

window.addEventListener('resize', _.debounce(handleResize, 100));
handleResize();

// iOS detection
if (navigator.userAgent.match(/iPad|iPhone|iPod/)) {
    document.body.classList.add('ios');
}
