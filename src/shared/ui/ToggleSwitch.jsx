import React from 'react';
import './ToggleSwitch.css';

/**
 * props:
 *  checked: boolean
 *  onChange: (next:boolean) => void
 *  disabled?: boolean
 *  label?: string
 *  title?: string
 */
export default function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label = '',
  title = '',
}) {
  // Стопимо спливання, щоб не клікалась картка/рядок-”кнопка” довкола
  const stop = (e) => {
    e.stopPropagation();
  };

  return (
    <label className={`tg ${disabled ? 'is-dis' : ''}`} title={title}
           onClick={stop} onMouseDown={stop} onKeyDown={stop}>
      <input
        className="tg__inp"
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
        // дублюємо підстраховку і на input
        onClick={stop}
        onMouseDown={stop}
        onKeyDown={stop}
      />
      <span className="tg__knob" aria-hidden />
      {label ? <span className="tg__label">{label}</span> : null}
    </label>
  );
}
