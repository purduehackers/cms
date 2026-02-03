'use client'
import React from 'react'
import { useField, FieldLabel } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'

const options = [
  { label: 'Hack Night', value: 'hack-night' },
  { label: 'Workshop', value: 'workshop' },
  { label: 'Show', value: 'show' },
]

const EventTypeField: TextFieldClientComponent = ({ field, path }) => {
  const { value, setValue } = useField<string>({ path })
  const [otherText, setOtherText] = React.useState('')

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
    <div className="field-type text">
      <FieldLabel label={field.label || field.name} path={path} required={field.required} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
        {options.map((option) => (
          <label
            key={option.value}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <input
              type="radio"
              name={path}
              value={option.value}
              checked={selectedValue === option.value}
              onChange={() => handleRadioChange(option.value)}
            />
            {option.label}
          </label>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="radio"
            name={path}
            value="other"
            checked={selectedValue === 'other'}
            onChange={() => handleRadioChange('other')}
          />
          Other:
          <input
            type="text"
            value={otherText}
            onChange={handleOtherTextChange}
            onFocus={() => {
              if (selectedValue !== 'other') {
                handleRadioChange('other')
              }
            }}
            placeholder="Enter event type"
            style={{
              padding: '4px 8px',
              border: '1px solid var(--theme-elevation-150)',
              borderRadius: '4px',
              background: 'var(--theme-elevation-0)',
              color: 'var(--theme-elevation-1000)',
            }}
          />
        </label>
      </div>
    </div>
  )
}

export default EventTypeField
