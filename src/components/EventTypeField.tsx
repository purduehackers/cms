'use client'
import React, { useId } from 'react'
import { useField, FieldLabel } from '@payloadcms/ui'
import { Radio } from '@payloadcms/ui/fields/RadioGroup/Radio'
import type { TextFieldClientComponent } from 'payload'

const options = [
  { label: 'Hack Night', value: 'hack-night' },
  { label: 'Workshop', value: 'workshop' },
  { label: 'Show', value: 'show' },
]

const EventTypeField: TextFieldClientComponent = ({ field, path }) => {
  const { value, setValue } = useField<string>({ path })
  const uuid = useId()

  // Check if current value is a preset option
  const isPresetValue = options.some((opt) => opt.value === value)

  // Track whether "other" is selected (either explicitly or because value isn't a preset)
  const [isOtherSelected, setIsOtherSelected] = React.useState(
    !isPresetValue && value !== undefined,
  )
  const [otherText, setOtherText] = React.useState(!isPresetValue ? value || '' : '')

  const selectedValue = isOtherSelected ? 'other' : value

  const handleRadioChange = (newValue: string) => {
    if (newValue === 'other') {
      setIsOtherSelected(true)
      setValue(otherText)
    } else {
      setIsOtherSelected(false)
      setValue(newValue)
    }
  }

  const handleOtherTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setOtherText(text)
    setIsOtherSelected(true)
    setValue(text)
  }

  return (
    <div className="field-type radio-group">
      <FieldLabel label={field.label || field.name} path={path} required={field.required} />
      <ul className="radio-group--group">
        {options.map((option) => (
          <li key={option.value}>
            <Radio
              id={`${path}-${option.value}`}
              isSelected={selectedValue === option.value}
              onChange={() => handleRadioChange(option.value)}
              option={option}
              path={path}
              uuid={uuid}
            />
          </li>
        ))}
        <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Radio
            id={`${path}-other`}
            isSelected={selectedValue === 'other'}
            onChange={() => handleRadioChange('other')}
            option={{ label: 'Other:', value: 'other' }}
            path={path}
            uuid={uuid}
          />
          <input
            type="text"
            value={otherText}
            onChange={handleOtherTextChange}
            onFocus={() => {
              if (!isOtherSelected) {
                setIsOtherSelected(true)
                setValue(otherText)
              }
            }}
            placeholder="Enter event type"
            className="text-input"
          />
        </li>
      </ul>
    </div>
  )
}

export default EventTypeField
