import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';
import LoadingOverlay from '../components/LoadingOverlay';
import LoadingButton from '../components/LoadingButton';
import ConfirmModal from '../components/ConfirmModal';

const initial = {
  name: 'Configuración principal',
  usd_to_clp: 1000,
  usd_to_clp_real: 1000,
  usd_to_clp_store: 1150,
  default_margin: 1.3,
  min_margin: 1.15,
  import_factor: 1.3,
  risk_factor: 1.1,
  margin_factor: 1.25,
  vat_percentage: 19,
  rounding_to: 100,
  is_active: true,
};

const ROUNDING_OPTIONS = [10, 50, 100, 500, 1000];
const PRODUCT_TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'single', label: 'Single' },
  { value: 'sealed', label: 'Sellado' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'accessory', label: 'Accesorio' },
];

const normalizeList = (data) => data?.results || data || [];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatPercentage = (factor) => {
  return Math.round((Number(factor || 1) - 1) * 100);
};

export default function PricingSettingsPage() {
  const [settings, setSettings] = useState(initial);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [recalcOptions, setRecalcOptions] = useState({
    apply_to_sale_price: false,
    only_negative_margin: true,
    only_with_stock: true,
    only_active: false,
    product_type: '',
    mode: 'real_cost',
  });
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [recalcResult, setRecalcResult] = useState(null);
  const [recalcWarning, setRecalcWarning] = useState('');

  const help = useMemo(
    () => ({
      importPct: formatPercentage(settings.import_factor),
      riskPct: formatPercentage(settings.risk_factor),
      marginPct: formatPercentage(settings.margin_factor),
      defaultMarginPct: formatPercentage(settings.default_margin),
      minMarginPct: formatPercentage(settings.min_margin),
      dollarGap:
        toNumber(settings.usd_to_clp_store) - toNumber(settings.usd_to_clp_real),
    }),
    [settings]
  );

  const loadSettings = async () => {
    setLoading(true);

    try {
      const { data } = await api.listPricingSettings();
      const list = normalizeList(data);
      const active = list.find((item) => item.is_active) || list[0];

      if (active) {
        setRecordId(active.id);
        setSettings({
          name: active.name || 'Configuración principal',
          usd_to_clp: toNumber(active.usd_to_clp, 1000),
          usd_to_clp_real: toNumber(active.usd_to_clp_real, 1000),
          usd_to_clp_store: toNumber(active.usd_to_clp_store, 1150),
          default_margin: toNumber(active.default_margin, 1.3),
          min_margin: toNumber(active.min_margin, 1.15),
          import_factor: toNumber(active.import_factor, 1.3),
          risk_factor: toNumber(active.risk_factor, 1.1),
          margin_factor: toNumber(active.margin_factor, 1.25),
          vat_percentage: toNumber(active.vat_percentage, 19),
          rounding_to: toNumber(active.rounding_to, 100),
          is_active: true,
        });
      }
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (!recalcWarning) return;
    const el = document.getElementById('recalcPricingModal');
    if (el) {
      const modal = new window.bootstrap.Modal(el);
      modal.show();
    }
  }, [recalcWarning]);

  const updateSetting = (field, value) => {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validate = () => {
    if (settings.usd_to_clp <= 0) {
      notyf.error('USD → CLP debe ser mayor a 0.');
      return false;
    }

    if (settings.usd_to_clp_real <= 0) {
      notyf.error('Dólar real debe ser mayor a 0.');
      return false;
    }

    if (settings.usd_to_clp_store <= 0) {
      notyf.error('Dólar tienda debe ser mayor a 0.');
      return false;
    }

    const factors = [
      settings.default_margin,
      settings.min_margin,
      settings.import_factor,
      settings.risk_factor,
      settings.margin_factor,
    ];

    if (factors.some((value) => Number(value) < 1)) {
      notyf.error('Los factores y márgenes deben ser mayores o iguales a 1.');
      return false;
    }

    if (settings.vat_percentage < 0) {
      notyf.error('El IVA no puede ser negativo.');
      return false;
    }

    if (!ROUNDING_OPTIONS.includes(Number(settings.rounding_to))) {
      notyf.error('Redondeo inválido.');
      return false;
    }

    return true;
  };

  const buildPayload = () => ({
    name: settings.name || 'Configuración principal',
    usd_to_clp: Number(settings.usd_to_clp),
    usd_to_clp_real: Number(settings.usd_to_clp_real),
    usd_to_clp_store: Number(settings.usd_to_clp_store),
    default_margin: Number(settings.default_margin),
    min_margin: Number(settings.min_margin),
    import_factor: Number(settings.import_factor),
    risk_factor: Number(settings.risk_factor),
    margin_factor: Number(settings.margin_factor),
    vat_percentage: Number(settings.vat_percentage),
    rounding_to: Number(settings.rounding_to),
    is_active: true,
  });

  const save = async () => {
    if (!validate()) return;

    setSaving(true);

    try {
      const payload = buildPayload();

      if (recordId) {
        await api.updatePricingSettings(recordId, payload);
      } else {
        const { data } = await api.createPricingSettings(payload);
        setRecordId(data.id);
      }

      notyf.success('Configuración guardada correctamente.');
      await loadSettings();
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setSaving(false);
    }
  };


  const executeRecalculatePrices = async () => {
    if (!recalcWarning) return;

    setRecalcLoading(true);
    try {
      const payload = {
        ...recalcOptions,
        product_type: recalcOptions.product_type || null,
      };
      const { data } = await api.recalculateProductPrices(payload);
      setRecalcResult(data);
      notyf.success('Recalculo ejecutado correctamente.');
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setRecalcLoading(false);
      setRecalcWarning('');
    }
  };

  const recalculatePrices = async () => {
    const warning = recalcOptions.apply_to_sale_price
      ? 'Esta opción cambiará el precio visible en tienda. ¿Deseas continuar?'
      : 'Esta acción recalculará precios sugeridos usando la configuración activa. No modificará stock ni Kardex. ¿Deseas continuar?';

    setRecalcWarning(warning);
  };

  if (loading) {
    return (
      <div className="alert alert-info">
        Cargando configuración de precios...
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h3 className="mb-1">Configuración de precios</h3>
          <p className="text-muted mb-0">
            Define dólar, factores de importación, margen comercial y redondeo
            usado para calcular precios sugeridos.
          </p>
        </div>

        <LoadingButton
          className="btn btn-outline-secondary"
          onClick={loadSettings}
          loading={loading}
          disabled={saving || recalcLoading}
          loadingText="Actualizando..."
        >
          Actualizar
        </LoadingButton>
      </div>

      <div className="panel-card p-3">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Nombre configuración</label>
            <input
              className="form-control"
              value={settings.name}
              onChange={(event) => updateSetting('name', event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="col-md-4">
            <label className="form-label">Dólar base USD → CLP</label>
            <input
              className="form-control"
              type="number"
              min="1"
              value={settings.usd_to_clp}
              onChange={(event) =>
                updateSetting('usd_to_clp', Number(event.target.value))
              }
              disabled={saving}
            />
            <small className="text-muted">
              Valor usado como referencia general.
            </small>
          </div>

          <div className="col-md-4">
            <label className="form-label">Dólar real pagado</label>
            <input
              className="form-control"
              type="number"
              min="1"
              value={settings.usd_to_clp_real}
              onChange={(event) =>
                updateSetting('usd_to_clp_real', Number(event.target.value))
              }
              disabled={saving}
            />
            <small className="text-muted">
              Valor real según pago, banco o PayPal.
            </small>
          </div>

          <div className="col-md-4">
            <label className="form-label">Dólar tienda</label>
            <input
              className="form-control"
              type="number"
              min="1"
              value={settings.usd_to_clp_store}
              onChange={(event) =>
                updateSetting('usd_to_clp_store', Number(event.target.value))
              }
              disabled={saving}
            />
            <small className="text-muted">
              Diferencia vs dólar real: {help.dollarGap.toLocaleString('es-CL')} CLP.
            </small>
          </div>

          <div className="col-md-4">
            <label className="form-label">Factor importación</label>
            <input
              className="form-control"
              type="number"
              step="0.01"
              min="1"
              value={settings.import_factor}
              onChange={(event) =>
                updateSetting('import_factor', Number(event.target.value))
              }
              disabled={saving}
            />
            <small className="text-muted">Equivale a +{help.importPct}%.</small>
          </div>

          <div className="col-md-4">
            <label className="form-label">Factor riesgo</label>
            <input
              className="form-control"
              type="number"
              step="0.01"
              min="1"
              value={settings.risk_factor}
              onChange={(event) =>
                updateSetting('risk_factor', Number(event.target.value))
              }
              disabled={saving}
            />
            <small className="text-muted">Equivale a +{help.riskPct}%.</small>
          </div>

          <div className="col-md-4">
            <label className="form-label">Margen negocio</label>
            <input
              className="form-control"
              type="number"
              step="0.01"
              min="1"
              value={settings.margin_factor}
              onChange={(event) =>
                updateSetting('margin_factor', Number(event.target.value))
              }
              disabled={saving}
            />
            <small className="text-muted">Equivale a +{help.marginPct}%.</small>
          </div>

          <div className="col-md-4">
            <label className="form-label">Margen por defecto</label>
            <input
              className="form-control"
              type="number"
              step="0.01"
              min="1"
              value={settings.default_margin}
              onChange={(event) =>
                updateSetting('default_margin', Number(event.target.value))
              }
              disabled={saving}
            />
            <small className="text-muted">
              Equivale a +{help.defaultMarginPct}%.
            </small>
          </div>

          <div className="col-md-4">
            <label className="form-label">Margen mínimo</label>
            <input
              className="form-control"
              type="number"
              step="0.01"
              min="1"
              value={settings.min_margin}
              onChange={(event) =>
                updateSetting('min_margin', Number(event.target.value))
              }
              disabled={saving}
            />
            <small className="text-muted">
              Equivale a +{help.minMarginPct}%.
            </small>
          </div>

          <div className="col-md-4">
            <label className="form-label">IVA %</label>
            <input
              className="form-control"
              type="number"
              step="0.01"
              min="0"
              value={settings.vat_percentage}
              onChange={(event) =>
                updateSetting('vat_percentage', Number(event.target.value))
              }
              disabled={saving}
            />
            <small className="text-muted">
              Por defecto en Chile: 19%.
            </small>
          </div>

          <div className="col-md-4">
            <label className="form-label">Redondeo comercial</label>
            <select
              className="form-select"
              value={settings.rounding_to}
              onChange={(event) =>
                updateSetting('rounding_to', Number(event.target.value))
              }
              disabled={saving}
            >
              {ROUNDING_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value.toLocaleString('es-CL')} CLP
                </option>
              ))}
            </select>
            <small className="text-muted">
              Ejemplo: redondear a centenas o miles.
            </small>
          </div>

          <div className="col-12">
            <div className="alert alert-info mb-0">
              Ejemplo rápido: si una carta cuesta 10 USD y usas dólar tienda{' '}
              <strong>{settings.usd_to_clp_store}</strong>, su base sería{' '}
              <strong>
                $
                {Math.round(
                  10 * Number(settings.usd_to_clp_store || 0)
                ).toLocaleString('es-CL')}
              </strong>{' '}
              antes de aplicar factores y margen.
            </div>
          </div>

          <div className="col-12">
            <button
              type="button"
              className="btn btn-primary"
              onClick={save}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </div>
      </div>

      <div className="panel-card p-3 mt-4">
        <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h5 className="mb-1">Recalcular precios de productos</h5>
            <p className="text-muted mb-0">
              Ejecuta recálculo masivo con filtros opcionales, sin tocar stock ni Kardex.
            </p>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Modo de recálculo</label>
            <select
              className="form-select"
              value={recalcOptions.mode}
              onChange={(event) =>
                setRecalcOptions((current) => ({
                  ...current,
                  mode: event.target.value,
                }))
              }
              disabled={recalcLoading}
            >
              <option value="real_cost">Desde costo real histórico</option>
              <option value="current_usd">Desde dólar actual / precio USD referencia</option>
            </select>
          </div>
          <div className="col-md-4">
            <div className="form-check">
              <input
                id="apply_to_sale_price"
                className="form-check-input"
                type="checkbox"
                checked={recalcOptions.apply_to_sale_price}
                onChange={(event) =>
                  setRecalcOptions((current) => ({
                    ...current,
                    apply_to_sale_price: event.target.checked,
                  }))
                }
                disabled={recalcLoading}
              />
              <label htmlFor="apply_to_sale_price" className="form-check-label">
                apply_to_sale_price
              </label>
            </div>
          </div>

          <div className="col-md-4">
            <div className="form-check">
              <input
                id="only_negative_margin"
                className="form-check-input"
                type="checkbox"
                checked={recalcOptions.only_negative_margin}
                onChange={(event) =>
                  setRecalcOptions((current) => ({
                    ...current,
                    only_negative_margin: event.target.checked,
                  }))
                }
                disabled={recalcLoading}
              />
              <label htmlFor="only_negative_margin" className="form-check-label">
                only_negative_margin
              </label>
            </div>
          </div>

          <div className="col-md-4">
            <div className="form-check">
              <input
                id="only_with_stock"
                className="form-check-input"
                type="checkbox"
                checked={recalcOptions.only_with_stock}
                onChange={(event) =>
                  setRecalcOptions((current) => ({
                    ...current,
                    only_with_stock: event.target.checked,
                  }))
                }
                disabled={recalcLoading}
              />
              <label htmlFor="only_with_stock" className="form-check-label">
                only_with_stock
              </label>
            </div>
          </div>

          <div className="col-md-4">
            <label className="form-label">product_type</label>
            <select
              className="form-select"
              value={recalcOptions.product_type}
              onChange={(event) =>
                setRecalcOptions((current) => ({
                  ...current,
                  product_type: event.target.value,
                }))
              }
              disabled={recalcLoading}
            >
              {PRODUCT_TYPE_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12">
            <button
              type="button"
              className="btn btn-warning"
              onClick={recalculatePrices}
              disabled={recalcLoading}
            >
              {recalcLoading ? 'Recalculando...' : 'Recalcular precios'}
            </button>
          </div>

          <div className="col-12">
            <div className="alert alert-secondary mb-0">
              <strong>Resultado:</strong>{' '}
              {recalcResult ? (
                <pre className="mb-0 mt-2">
                  {JSON.stringify(recalcResult, null, 2)}
                </pre>
              ) : (
                <span className="text-muted">Aún no se ha ejecutado el recálculo.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <LoadingOverlay
        show={recalcLoading}
        blocking
        title="Recalculando precios"
        message="Actualizando precios sugeridos según la configuración activa."
        steps={[
          'Cargando configuración',
          'Procesando productos',
          'Calculando precios sugeridos',
          'Guardando resultados',
        ]}
        currentStep={1}
      />
      <ConfirmModal
        id="recalcPricingModal"
        title="Recalcular precios"
        text={recalcWarning}
        confirmText="Recalcular"
        confirmVariant="warning"
        onConfirm={executeRecalculatePrices}
      />
    </div>
  );
}
