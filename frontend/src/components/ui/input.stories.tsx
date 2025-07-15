import type { Meta, StoryObj } from '@storybook/react';

import { Input } from './input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
    },
    placeholder: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
    required: {
      control: 'boolean',
    },
  },
  args: {
    placeholder: 'Enter text...',
    disabled: false,
    required: false,
  },
};

// biome-ignore lint/style/noDefaultExport: Storybook requires default export for meta
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: 'text',
    placeholder: 'Enter text...',
  },
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'Enter email...',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password...',
  },
};

export const NumberInput: Story = {
  args: {
    type: 'number',
    placeholder: 'Enter number...',
  },
};

export const Search: Story = {
  args: {
    type: 'search',
    placeholder: 'Search...',
  },
};

export const Disabled: Story = {
  args: {
    type: 'text',
    placeholder: 'Disabled input',
    disabled: true,
  },
};

export const Required: Story = {
  args: {
    type: 'text',
    placeholder: 'Required field',
    required: true,
  },
};

export const WithValue: Story = {
  args: {
    type: 'text',
    defaultValue: 'Pre-filled value',
  },
};

export const AllTypes: Story = {
  render: () => (
    <div className='flex w-80 flex-col gap-4'>
      <Input type='text' placeholder='Text input' />
      <Input type='email' placeholder='Email input' />
      <Input type='password' placeholder='Password input' />
      <Input type='number' placeholder='Number input' />
      <Input type='tel' placeholder='Phone number' />
      <Input type='url' placeholder='URL input' />
      <Input type='search' placeholder='Search input' />
      <Input type='text' placeholder='Disabled input' disabled />
      <Input type='text' placeholder='Required field' required />
    </div>
  ),
};
