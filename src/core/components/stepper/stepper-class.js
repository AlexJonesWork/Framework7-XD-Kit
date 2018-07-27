import $ from 'dom7';
import Utils from '../../utils/utils';
import Framework7Class from '../../utils/class';

class Stepper extends Framework7Class {
  constructor(app, params) {
    super(params, [app]);
    const stepper = this;

    const defaults = {
      el: null,
      inputEl: null,
      valueEl: null,
      value: 0,
      formatValue: null,
      step: 1,
      min: 0,
      max: 100,
      watchInput: true,
      autorepeat: false,
      autorepeatDynamic: false,
      wraps: false,
      decimalPoint: 4,
	  buttonsEndInputMode: true,
    };

    // Extend defaults with modules params
    stepper.useModulesParams(defaults);

    stepper.params = Utils.extend(defaults, params);
    if (stepper.params.value < stepper.params.min) {
      stepper.params.value = stepper.params.min;
    }
    if (stepper.params.value > stepper.params.max) {
      stepper.params.value = stepper.params.max;
    }

    const el = stepper.params.el;
    if (!el) return stepper;

    const $el = $(el);
    if ($el.length === 0) return stepper;

    if ($el[0].f7Stepper) return $el[0].f7Stepper;

    let $inputEl;
    if (stepper.params.inputEl) {
      $inputEl = $(stepper.params.inputEl);
    } else if ($el.find('.stepper-input-wrap').find('input, textarea').length) {
      $inputEl = $el.find('.stepper-input-wrap').find('input, textarea').eq(0);
    }

    if ($inputEl && $inputEl.length) {
      ('step min max').split(' ').forEach((paramName) => {
        if (!params[paramName] && $inputEl.attr(paramName)) {
          stepper.params[paramName] = parseFloat($inputEl.attr(paramName));
        }
      });
	  
	  const decimalPoint = parseInt(stepper.params.decimalPoint);
      if (Number.isNaN(decimalPoint)) {
        stepper.params.decimalPoint = 0;
      } else {
        stepper.params.decimalPoint = decimalPoint;
      }

      const inputValue = parseFloat($inputEl.val());
      if (typeof params.value === 'undefined' && !Number.isNaN(inputValue) && (inputValue || inputValue === 0)) {
        stepper.params.value = inputValue;
      }
    }

    let $valueEl;
    if (stepper.params.valueEl) {
      $valueEl = $(stepper.params.valueEl);
    } else if ($el.find('.stepper-value').length) {
      $valueEl = $el.find('.stepper-value').eq(0);
    }

    const $buttonPlusEl = $el.find('.stepper-button-plus');
    const $buttonMinusEl = $el.find('.stepper-button-minus');

    const { step, min, max, value, decimalPoint } = stepper.params;

    Utils.extend(stepper, {
      app,
      $el,
      el: $el[0],
      $buttonPlusEl,
      buttonPlusEl: $buttonPlusEl[0],
      $buttonMinusEl,
      buttonMinusEl: $buttonMinusEl[0],
      $inputEl,
      inputEl: $inputEl ? $inputEl[0] : undefined,
      $valueEl,
      valueEl: $valueEl ? $valueEl[0] : undefined,
      step,
      min,
      max,
      value,      
	  decimalPoint,
    });

    $el[0].f7Stepper = stepper;

    // Handle Events
    const touchesStart = {};
    let isTouched;
    let isScrolling;
    let preventButtonClick;
    let intervalId;
    let timeoutId;
    let autorepeatAction = null;
    let autorepeatInAction = false;    
	let manualInput = false;

    function dynamicRepeat(current, progressions, startsIn, progressionStep, repeatEvery, action) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (current === 1) {
          preventButtonClick = true;
          autorepeatInAction = true;
        }
        clearInterval(intervalId);
        action();
        intervalId = setInterval(() => {
          action();
        }, repeatEvery);
        if (current < progressions) {
          dynamicRepeat(current + 1, progressions, startsIn, progressionStep, repeatEvery / 2, action);
        }
      }, current === 1 ? startsIn : progressionStep);
    }

    function onTouchStart(e) {
      if (isTouched) return;      
	  if (manualInput) { return; }
      if ($(e.target).closest($buttonPlusEl).length) {
        autorepeatAction = 'increment';
      } else if ($(e.target).closest($buttonMinusEl).length) {
        autorepeatAction = 'decrement';
      }
      if (!autorepeatAction) return;

      touchesStart.x = e.type === 'touchstart' ? e.targetTouches[0].pageX : e.pageX;
      touchesStart.y = e.type === 'touchstart' ? e.targetTouches[0].pageY : e.pageY;
      isTouched = true;
      isScrolling = undefined;

      const progressions = stepper.params.autorepeatDynamic ? 4 : 1;
      dynamicRepeat(1, progressions, 500, 1000, 300, () => {
        stepper[autorepeatAction]();
      });
    }
    function onTouchMove(e) {
      if (!isTouched) return;
	  if (manualInput) { return; }
      const pageX = e.type === 'touchmove' ? e.targetTouches[0].pageX : e.pageX;
      const pageY = e.type === 'touchmove' ? e.targetTouches[0].pageY : e.pageY;

      if (typeof isScrolling === 'undefined' && !autorepeatInAction) {
        isScrolling = !!(isScrolling || Math.abs(pageY - touchesStart.y) > Math.abs(pageX - touchesStart.x));
      }
      const distance = (((pageX - touchesStart.x) ** 2) + ((pageY - touchesStart.y) ** 2)) ** 0.5;

      if (isScrolling || distance > 20) {
        isTouched = false;
        clearTimeout(timeoutId);
        clearInterval(intervalId);
      }
    }
    function onTouchEnd() {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      autorepeatAction = null;
      autorepeatInAction = false;
      isTouched = false;
    }

    function onMinusClick() {
	  if (manualInput) {
        if (stepper.params.buttonsEndInputMode) {
          manualInput = false;
          stepper.endTypeMode();
        };
        return;
      }
      if (preventButtonClick) {
        preventButtonClick = false;
        return;
      }
      stepper.decrement();
    }
    function onPlusClick() {
	  if (manualInput) {
        if (stepper.params.buttonsEndInputMode) {
          manualInput = false;
          stepper.endTypeMode();
        };
        return;
      }
      if (preventButtonClick) {
        preventButtonClick = false;
        return;
      }
      stepper.increment();
    }
    function onInputClick(e) {
      if (!e.target.readOnly) {
        manualInput = true;
        if (typeof e.target.selectionStart == "number") {
          e.target.selectionStart = e.target.selectionEnd = e.target.value.length;
        }
      }
    }
    function onInputKey(e) {
      if (e.keyCode == 13 || e.which == 13) {
        e.preventDefault();
        manualInput = false;
        stepper.endTypeMode();
      }
    }
    function onInputBlur() {
      manualInput = false;
      stepper.endTypeMode();
    }
    function onInput(e) {
      if (e.detail && e.detail.sentByF7Stepper) return;
      stepper.setValue(e.target.value, true);
    }
    stepper.attachEvents = function attachEvents() {
      $buttonMinusEl.on('click', onMinusClick);
      $buttonPlusEl.on('click', onPlusClick);
      if (stepper.params.watchInput && $inputEl && $inputEl.length) {
        $inputEl.on('input', onInput);
        $inputEl.on('click', onInputClick);
        $inputEl.on('blur', onInputBlur);
        $inputEl.on('keyup', onInputKey);
      }
      if (stepper.params.autorepeat) {
        app.on('touchstart:passive', onTouchStart);
        app.on('touchmove:active', onTouchMove);
        app.on('touchend:passive', onTouchEnd);
      }
    };
    stepper.detachEvents = function detachEvents() {
      $buttonMinusEl.off('click', onMinusClick);
      $buttonPlusEl.off('click', onPlusClick);
      if (stepper.params.watchInput && $inputEl && $inputEl.length) {
        $inputEl.off('input', onInput);
        $inputEl.off('click', onInputClick);
        $inputEl.off('blur', onInputBlur);
        $inputEl.off('keyup', onInputKey);
      }
    };

    // Install Modules
    stepper.useModules();

    // Init
    stepper.init();

    return stepper;
  }

  minus() {
    return this.decrement();
  }

  plus() {
    return this.increment();
  }

  decrement() {
    const stepper = this;
    return stepper.setValue(stepper.value - stepper.step);
  }

  increment() {
    const stepper = this;
    return stepper.setValue(stepper.value + stepper.step);
  }

  setValue(newValue, forceUpdate) {
    const stepper = this;
    const { step, min, max } = stepper;

    const oldValue = stepper.value;

    let value = Math.round(newValue / step) * step;
    if (!stepper.params.wraps) {
      value = Math.max(Math.min(value, max), min);
    } else {
      if (value > max) value = min;
      if (value < min) value = max;
    }
    if (Number.isNaN(value)) {
      value = oldValue;
    }
    stepper.value = value;

    const valueChanged = oldValue !== value;

    // Events
    if (!valueChanged && !forceUpdate) return stepper;
    stepper.$el.trigger('stepper:change', stepper, stepper.value);
    const formattedValue = stepper.formatValue(stepper.value);
    if (stepper.$inputEl && stepper.$inputEl.length) {
      stepper.$inputEl.val(formattedValue);
      stepper.$inputEl.trigger('input change', { sentByF7Stepper: true });
    }
    if (stepper.$valueEl && stepper.$valueEl.length) {
      stepper.$valueEl.html(formattedValue);
    }
    stepper.emit('local::change stepperChange', stepper, stepper.value);
    return stepper;
  }

  endTypeMode() {
    const stepper = this;
    stepper.value = parseFloat(stepper.value);

    stepper.$el.trigger('stepper:change', stepper, stepper.value);
    const formattedValue = stepper.formatValue(stepper.value);
    if (stepper.$inputEl && stepper.$inputEl.length) {
      stepper.$inputEl.val(formattedValue);
      stepper.$inputEl.trigger('input change', { sentByF7Stepper: true });
      stepper.$inputEl.blur();
    }
    if (stepper.$valueEl && stepper.$valueEl.length) {
      stepper.$valueEl.html(formattedValue);
    }
    stepper.emit('local::change stepperChange', stepper, stepper.value);
    return stepper;
  };

  typeValue(value) {
    const stepper = this;
    const { step, min, max } = stepper;

    let _inputTxt = String(value);
    if (_inputTxt.lastIndexOf('.') + 1 == _inputTxt.length || _inputTxt.lastIndexOf(',') + 1 == _inputTxt.length) {
      if (_inputTxt.lastIndexOf('.') != _inputTxt.indexOf('.') || _inputTxt.lastIndexOf(',') != _inputTxt.indexOf(',')) {
        _inputTxt = _inputTxt.slice(0, -1);
        stepper.value = _inputTxt;
        stepper.$inputEl.val(stepper.value);
        return;
      }
    } else {
      let value = parseFloat(_inputTxt.replace(',', '.'));
      if (value === 0) {
        stepper.value = _inputTxt.replace(',', '.');
        stepper.$inputEl.val(stepper.value);
        return;
      }
      if (isNaN(value)) {
        stepper.value = 0;
        stepper.$inputEl.val(stepper.value);
        return;
      }
      else {
        const powVal = Math.pow(10, stepper.params.decimalPoint);
        value = (Math.round((value) * powVal)).toFixed(stepper.params.decimalPoint + 1) / powVal;
        stepper.value = parseFloat(String(value).replace(',', '.'));
        stepper.$inputEl.val(stepper.value);
        return;
      }
    }
    stepper.value = _inputTxt;
    stepper.$inputEl.val(_inputTxt);
    return stepper;
  };

  getValue() {
    return this.value;
  }

  formatValue(value) {
    const stepper = this;
    if (!stepper.params.formatValue) return value;
    return stepper.params.formatValue.call(stepper, value);
  }

  init() {
    const stepper = this;
    stepper.attachEvents();
    if (stepper.$valueEl && stepper.$valueEl.length) {
      const formattedValue = stepper.formatValue(stepper.value);
      stepper.$valueEl.html(formattedValue);
    }
    return stepper;
  }

  destroy() {
    let stepper = this;
    stepper.$el.trigger('stepper:beforedestroy', stepper);
    stepper.emit('local::beforeDestroy stepperBeforeDestroy', stepper);
    delete stepper.$el[0].f7Stepper;
    stepper.detachEvents();
    Utils.deleteProps(stepper);
    stepper = null;
  }
}

export default Stepper;
