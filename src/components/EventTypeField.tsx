'use client'
import React, { useId } from 'react'
import { useField, FieldLabel, TextInput } from '@payloadcms/ui'
import { Radio } from '@payloadcms/ui/fields/RadioGroup/Radio'
import type { TextFieldClientComponent } from 'payload'

const options = [
  { label: 'Hack Night', value: 'hack-night' },
  { label: 'Workshop', value: 'workshop' },
  { label: 'Show', value: 'show' },
]

const EventTypeField: TextFieldClientComponent = ({ field, path }) => {
  const { value, setValue } = useField<string>({ path })
  const [otherText, setOtherText] = React.useState('')
  const uuid = useId()

  const isOther = value && !options.some((opt) => opt.value === value)
  const selectedValue = isOther ? 'other' : value

  React.useEffect(() => {
    if (isOther && value) {
      setOtherText(value)
    }
  }, [])

  const handleRadioChange = (newValue: string) => {
    if (newValue === 'other') {
      setValue(otherText || '')
    } else {
      setValue(newValue)
    }
  }

  const handleOtherTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setOtherText(text)
    if (selectedValue === 'other') {
      setValue(text)
    }
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
          <TextInput
            path={`${path}-other-text`}
            value={otherText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOtherTextChange(e)}
            onFocus={() => {
              if (selectedValue !== 'other') {
                handleRadioChange('other')
              }
            }}
            placeholder="Enter event type"
          />
        </li>
      </ul>
    </div>
  )
}

export default EventTypeField
