import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';
import CategoryForm from './CategoryForm';

const initialForm = {
  name: '',
  slug: '',
  description: '',
  is_active: true,
};

const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function CategoryCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const onChange = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      slug:
        key === 'name' && !current.slug
          ? slugify(value)
          : current.slug,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    const payload = {
      ...form,
      name: form.name.trim(),
      slug: slugify(form.slug || form.name),
      description: form.description.trim(),
    };

    if (!payload.name || !payload.slug) {
      notyf.error('Nombre y slug son obligatorios.');
      return;
    }

    setSaving(true);

    try {
      await api.createCategory(payload);
      notyf.success('Categoría creada correctamente.');
      navigate('/admin/categorias');
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setSaving(false);
    }
  };

  return (
    <CategoryForm
      form={form}
      saving={saving}
      onChange={onChange}
      onSubmit={submit}
    />
  );
}