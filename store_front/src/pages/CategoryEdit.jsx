import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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

export default function CategoryEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadCategory = async () => {
      setLoading(true);

      try {
        const { data } = await api.categoryById(id);

        setForm({
          name: data.name || '',
          slug: data.slug || '',
          description: data.description || '',
          is_active: Boolean(data.is_active),
        });
      } catch {
        // El apiClient ya muestra el error.
      } finally {
        setLoading(false);
      }
    };

    loadCategory();
  }, [id]);

  const onChange = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    const payload = {
      ...form,
      name: form.name.trim(),
      slug: slugify(form.slug || form.name),
      description: form.description.trim(),
      is_active: Boolean(form.is_active),
    };

    if (!payload.name || !payload.slug) {
      notyf.error('Nombre y slug son obligatorios.');
      return;
    }

    setSaving(true);

    try {
      await api.patchCategory(id, payload);
      notyf.success('Categoría actualizada correctamente.');
      navigate('/admin/categorias');
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="alert alert-info">Cargando categoría...</div>;
  }

  return (
    <CategoryForm
      form={form}
      saving={saving}
      onChange={onChange}
      onSubmit={submit}
    />
  );
}