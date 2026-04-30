import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';

const initial = { usd_to_clp: 1000, import_factor: 1.3, risk_factor: 1.1, margin_factor: 1.25, rounding_to: 100 };

export default function PricingSettingsPage() {
  const [settings, setSettings] = useState(initial);
  const [recordId, setRecordId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.listPricingSettings().then(({ data }) => {
      const list = data?.results || data || [];
      const active = list.find((it) => it.is_active) || list[0];
      if (active) {
        setRecordId(active.id);
        setSettings({
          usd_to_clp: Number(active.usd_to_clp), import_factor: Number(active.import_factor), risk_factor: Number(active.risk_factor), margin_factor: Number(active.margin_factor), rounding_to: Number(active.rounding_to),
        });
      }
    }).catch(() => notyf.error('No se pudo cargar configuración de precios'));
  }, []);

  const help = useMemo(() => ({
    importPct: Math.round((settings.import_factor - 1) * 100), riskPct: Math.round((settings.risk_factor - 1) * 100), marginPct: Math.round((settings.margin_factor - 1) * 100),
  }), [settings]);

  const save = async () => {
    if (settings.usd_to_clp <= 0) return notyf.error('USD->CLP debe ser mayor a 0');
    if ([settings.import_factor, settings.risk_factor, settings.margin_factor].some((v) => v < 1)) return notyf.error('Los factores deben ser >= 1');
    if (![10, 50, 100, 500, 1000].includes(Number(settings.rounding_to))) return notyf.error('Redondeo inválido');
    setSaving(true);
    try {
      if (recordId) await api.updatePricingSettings(recordId, { ...settings, is_active: true, name: 'Configuración principal' });
      else {
        const { data } = await api.createPricingSettings({ ...settings, is_active: true, name: 'Configuración principal' });
        setRecordId(data.id);
      }
      notyf.success('Configuración guardada');
    } catch (e) { notyf.error(e?.response?.data?.detail || 'No se pudo guardar'); } finally { setSaving(false); }
  };

  return <div><h3>Configuración de precios</h3><div className="card bg-dark text-light"><div className="card-body row g-3">
    <div className="col-md-4"><label className="form-label">Valor dólar USD → CLP</label><input className="form-control" type="number" min="1" value={settings.usd_to_clp} onChange={(e) => setSettings({ ...settings, usd_to_clp: Number(e.target.value) })} /></div>
    <div className="col-md-4"><label className="form-label">Factor importación</label><input className="form-control" type="number" step="0.01" min="1" value={settings.import_factor} onChange={(e) => setSettings({ ...settings, import_factor: Number(e.target.value) })} /><small>Equivale a +{help.importPct}%</small></div>
    <div className="col-md-4"><label className="form-label">Factor riesgo</label><input className="form-control" type="number" step="0.01" min="1" value={settings.risk_factor} onChange={(e) => setSettings({ ...settings, risk_factor: Number(e.target.value) })} /><small>Equivale a +{help.riskPct}%</small></div>
    <div className="col-md-4"><label className="form-label">Margen negocio</label><input className="form-control" type="number" step="0.01" min="1" value={settings.margin_factor} onChange={(e) => setSettings({ ...settings, margin_factor: Number(e.target.value) })} /><small>Equivale a +{help.marginPct}%</small></div>
    <div className="col-md-4"><label className="form-label">Redondeo comercial</label><select className="form-select" value={settings.rounding_to} onChange={(e) => setSettings({ ...settings, rounding_to: Number(e.target.value) })}>{[10,50,100,500,1000].map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
    <div className="col-12"><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar configuración'}</button></div>
  </div></div></div>;
}
