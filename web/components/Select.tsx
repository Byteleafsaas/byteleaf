'use client';

import { useState } from 'react';
import ListSelect from './ListSelect';

type Props = { id: string; name: string; options: string[]; defaultValue?: string };

// Uncontrolled select for plain forms on the public site (value is posted via a hidden input).
export default function Select({ id, name, options, defaultValue }: Props) {
  const [value, setValue] = useState(defaultValue ?? options[0]);
  return <ListSelect id={id} name={name} value={value} options={options} onChange={setValue} triggerClass="field" />;
}
