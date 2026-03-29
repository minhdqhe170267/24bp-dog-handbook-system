import { useState, useEffect } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import FilterSelect from '../../components/shared/FilterSelect';
import { Button, FormField, FormSelect, FormNumberInput, StatusBadge } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { symptomService } from '../../services/symptomService';
import { breedService } from '../../services/breedService';
import { CheckCircle, Loader2, AlertTriangle, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import { cn } from '../../utils/utils';
import { motion } from 'framer-motion';

const categories = ['EATING', 'BEHAVIOR', 'PHYSICAL', 'RESPIRATORY', 'SKIN', 'OTHER'];
const categoryLabels = {
  EATING: 'Ăn uống', BEHAVIOR: 'Hành vi', PHYSICAL: 'Thể chất', RESPIRATORY: 'Hô hấp', SKIN: 'Da', OTHER: 'Khác',
};

const urgencyConfig = {
  EMERGENCY: { icon: AlertCircle, bg: 'bg-destructive/10 border-destructive/30', text: 'text-destructive', label: '🚨 KHẨN CẤP' },
  HIGH: { icon: AlertTriangle, bg: 'bg-warning/10 border-warning/30', text: 'text-warning', label: '⚠️ CAO' },
  MEDIUM: { icon: Info, bg: 'bg-info/10 border-info/30', text: 'text-info', label: 'ℹ️ TRUNG BÌNH' },
  LOW: { icon: ShieldCheck, bg: 'bg-success/10 border-success/30', text: 'text-success', label: '✅ THẤP' },
};

const SymptomsPage = () => {
  const [activeTab, setActiveTab] = useState('list');
  const tabs = [
    { key: 'list', label: 'Danh sách triệu chứng' },
    { key: 'checker', label: '⭐ Kiểm tra triệu chứng' },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Quản lý Triệu chứng"
        description="Danh sách triệu chứng và kiểm tra chẩn đoán"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Triệu chứng' }]}
      />
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn('px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px cursor-pointer bg-transparent',
              activeTab === tab.key ? 'border-b-accent text-accent' : 'border-b-transparent text-muted-foreground hover:text-foreground'
            )}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'list' && <SymptomListTab />}
      {activeTab === 'checker' && <SymptomCheckerTab />}
    </div>
  );
};

const SymptomListTab = () => {
  const toast = useToast();
  const [symptoms, setSymptoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try { const res = await symptomService.getAll(); setSymptoms(Array.isArray(res.data) ? res.data : res.data?.content || []); }
      catch (err) { toast.error(err, { title: 'Không thể tải dữ liệu triệu chứng' }); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []); // eslint-disable-line

  const filtered = filterCategory ? symptoms.filter((s) => s.category === filterCategory) : symptoms;

  const columns = [
    { key: 'symptomCode', header: 'Mã', className: 'w-24' },
    { key: 'symptomName', header: 'Tên triệu chứng', render: (r) => <span className="font-medium text-foreground">{r.symptomName}</span> },
    {
      key: 'category', header: 'Danh mục', render: (r) => r.category ? (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-info/10 text-info">{categoryLabels[r.category] || r.category}</span>
      ) : '—'
    },
    { key: 'severityIndicator', header: 'Mức độ', render: (r) => r.severityIndicator ? <StatusBadge status={r.severityIndicator} /> : '—' },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <FilterSelect
          value={filterCategory}
          onChange={setFilterCategory}
          options={[
            { value: '', label: 'Tất cả' },
            ...categories.map((c) => ({ value: c, label: categoryLabels[c] || c })),
          ]}
          placeholder="Tất cả"
          className="w-52"
        />
      </div>
      <DataTable columns={columns} data={filtered} loading={loading} />
    </div>
  );
};

const SymptomCheckerTab = () => {
  const toast = useToast();
  const [symptoms, setSymptoms] = useState([]);
  const [breeds, setBreeds] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [breedId, setBreedId] = useState('');
  const [ageMonths, setAgeMonths] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [sRes, bRes] = await Promise.all([symptomService.getAll(), breedService.getAll(0, 100)]);
        setSymptoms(Array.isArray(sRes.data) ? sRes.data : sRes.data?.content || []);
        setBreeds(bRes.data?.content || []);
      } catch (err) { toast.error(err, { title: 'Không thể tải dữ liệu triệu chứng' }); }
      finally { setLoading(false); }
    };
    loadData();
  }, []); // eslint-disable-line

  const groupedSymptoms = categories.reduce((acc, cat) => {
    const items = symptoms.filter((s) => s.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const toggleSymptom = (id) => {
    setSelectedSymptoms((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const handleCheck = async () => {
    if (selectedSymptoms.length === 0) { toast.warning('Vui lòng chọn ít nhất 1 triệu chứng'); return; }
    setCheckLoading(true); setResult(null);
    try {
      const payload = { symptomIds: selectedSymptoms, ...(breedId && { breedId: Number(breedId) }), ...(ageMonths && { ageMonths: Number(ageMonths) }) };
      const res = await symptomService.check(payload);
      setResult(res.data);
    } catch (err) { toast.error(err, { title: 'Không thể kiểm tra triệu chứng' }); }
    finally { setCheckLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div>
      <div className="bg-card rounded-xl border border-border/60 p-6 mb-6">
        <h3 className="text-base font-semibold mb-4 text-foreground">Chọn triệu chứng</h3>
        {Object.entries(groupedSymptoms).map(([cat, items]) => (
          <div key={cat} className="mb-4">
            <p className="text-sm font-semibold mb-2 text-foreground">{categoryLabels[cat] || cat}</p>
            <div className="flex flex-wrap gap-2">
              {items.map((s) => (
                <button key={s.symptomId} onClick={() => toggleSymptom(s.symptomId)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer',
                    selectedSymptoms.includes(s.symptomId)
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'bg-muted/50 text-foreground border-border hover:bg-muted'
                  )}>
                  {s.symptomName}
                </button>
              ))}
            </div>
            <div className="h-px bg-border/40 mt-4" />
          </div>
        ))}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <FormField label="Giống chó (tùy chọn)">
            <FormSelect value={breedId} onChange={(e) => setBreedId(e.target.value)} placeholder="Chọn"
              options={breeds.map((b) => ({ value: b.breedId, label: b.breedName }))} />
          </FormField>
          <FormField label="Tuổi (tháng, tùy chọn)"><FormNumberInput value={ageMonths} onChange={(e) => setAgeMonths(e.target.value)} min={0} /></FormField>
          <div className="flex items-end"><Button className="w-full" loading={checkLoading} onClick={handleCheck}><CheckCircle className="h-4 w-4" />Kiểm tra</Button></div>
        </div>
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {(() => {
            const cfg = urgencyConfig[result.urgencyLevel] || urgencyConfig.MEDIUM;
            const Icon = cfg.icon;
            return (
              <div className={cn('flex items-start gap-3 p-4 rounded-xl border mb-4', cfg.bg)}>
                <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', cfg.text)} />
                <div>
                  <p className={cn('text-sm font-semibold', cfg.text)}>Mức độ khẩn cấp: {cfg.label}</p>
                  {result.recommendation && <p className={cn('text-sm mt-1', cfg.text)}>{result.recommendation}</p>}
                </div>
              </div>
            );
          })()}

          <div className="rounded-lg border border-border/60 overflow-hidden bg-card">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3">Tên bệnh</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 w-36">% Khớp</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3">Triệu chứng khớp</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3">Triệu chứng thiếu</th>
                </tr>
              </thead>
              <tbody>
                {(result.possibleDiseases || []).map((d, i) => (
                  <tr key={d.diseaseId || i} className={cn('border-t border-border/40 transition-colors',
                    d.matchPercentage >= 70 ? 'bg-destructive/5' : 'hover:bg-muted/30')}>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{d.diseaseName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${Math.round(d.matchPercentage)}%`, backgroundColor: d.matchPercentage >= 70 ? 'hsl(var(--destructive))' : 'hsl(var(--accent))' }} />
                        </div>
                        <span className="text-xs font-medium w-10">{Math.round(d.matchPercentage)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {d.matchedSymptoms?.map((s, j) => (
                          <span key={j} className="text-[11px] px-1.5 py-0.5 rounded bg-success/10 text-success">{s}</span>
                        )) || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {d.missingSymptomNames?.map((s, j) => (
                          <span key={j} className="text-[11px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">{s}</span>
                        )) || '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SymptomsPage;
