import { useState } from 'react';
import { Autocomplete, TextField, Chip } from '@mui/material';
import { listVehicles } from '../../../../api/vehicles';
import type { VehicleListItem } from '../../../../types';

interface VehicleInterestPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function VehicleInterestPicker({ selectedIds, onChange }: VehicleInterestPickerProps) {
  const [options, setOptions] = useState<VehicleListItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<VehicleListItem[]>([]);

  const handleInputChange = async (_: React.SyntheticEvent, value: string) => {
    setInputValue(value);
    if (!value || value.length < 2) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const result = await listVehicles({ q: value, limit: 20 });
      setOptions(result.data);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (_: React.SyntheticEvent, value: VehicleListItem[]) => {
    setSelected(value);
    onChange(value.map((v) => v.id));
  };

  const vehicleLabel = (v: VehicleListItem) =>
    `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ''} — Stock #${v.stockNumber}`;

  return (
    <Autocomplete
      multiple
      options={options}
      value={selected.filter((s) => selectedIds.includes(s.id))}
      inputValue={inputValue}
      loading={loading}
      getOptionLabel={vehicleLabel}
      isOptionEqualToValue={(opt, val) => opt.id === val.id}
      filterOptions={(x) => x}
      onInputChange={handleInputChange}
      onChange={handleChange}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => (
          <Chip
            label={vehicleLabel(option)}
            size="small"
            {...getTagProps({ index })}
            key={option.id}
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Vehicles of Interest"
          placeholder="Search by year, make, model, or stock #..."
          size="small"
        />
      )}
    />
  );
}
