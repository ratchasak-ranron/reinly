import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { GraduationCap } from 'lucide-react';
import type { CourseCreateInput, Patient } from '@reinly/domain';
import { isCoursePackage } from '@reinly/domain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { FormError } from '@/components/ui/form-feedback';
import { usePatients } from '@/features/patient';
import { useProducts } from '@/store/product-store';
import { useCreateCourse } from '../hooks/use-courses';

interface CourseFormProps {
  patientId?: string;
  onDone: () => void;
  onCancel: () => void;
}

const MANUAL_OPTION = '__manual__';

export function CourseForm({ patientId, onDone, onCancel }: CourseFormProps) {
  const { t } = useTranslation();
  const create = useCreateCourse();
  const products = useProducts();
  const submittingRef = useRef(false);

  const patientLocked = !!patientId;
  const patients = usePatients('');
  const patientOptions = useMemo(() => {
    const arr = patients.data ?? [];
    return arr.map((p: Patient) => ({ value: p.id, label: p.fullName }));
  }, [patients.data]);

  const packageProducts = useMemo(
    () => products.filter((p) => p.active && isCoursePackage(p)),
    [products],
  );
  const productOptions = useMemo(
    () => [
      { value: MANUAL_OPTION, label: t('course.manualEntry') },
      ...packageProducts.map((p) => ({
        value: p.id,
        label: t('course.productOption', {
          name: p.name,
          count: p.sessionsIncluded ?? 0,
        }),
      })),
    ],
    [packageProducts, t],
  );

  const [productId, setProductId] = useState<string>(MANUAL_OPTION);
  const [selectedPatient, setSelectedPatient] = useState<string>(
    patientId ?? patientOptions[0]?.value ?? '',
  );
  const [serviceName, setServiceName] = useState('');
  const [sessionsTotal, setSessionsTotal] = useState<number>(6);
  const [pricePaid, setPricePaid] = useState<number>(0);
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleProductChange(next: string) {
    setProductId(next);
    if (next === MANUAL_OPTION) return;
    const product = packageProducts.find((p) => p.id === next);
    if (!product) return;
    setServiceName(product.name);
    setSessionsTotal(product.sessionsIncluded ?? 1);
    setPricePaid(product.price);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingRef.current) return;
    setError(null);

    const pid = patientId ?? selectedPatient;
    if (!pid) {
      setError(t('course.errors.patientRequired'));
      return;
    }
    if (!serviceName.trim()) {
      setError(t('course.errors.serviceRequired'));
      return;
    }
    if (sessionsTotal <= 0) {
      setError(t('course.errors.sessionsInvalid'));
      return;
    }
    if (pricePaid < 0) {
      setError(t('course.errors.priceInvalid'));
      return;
    }

    const input: CourseCreateInput = {
      patientId: pid,
      serviceName: serviceName.trim(),
      sessionsTotal,
      pricePaid,
      expiresAt: expiresAt ? `${expiresAt}T00:00:00.000Z` : undefined,
    };

    submittingRef.current = true;
    create.mutate(input, {
      onSuccess: () => {
        submittingRef.current = false;
        onDone();
      },
      onError: (err) => {
        submittingRef.current = false;
        setError(err.message);
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!patientLocked ? (
        <div className="space-y-1.5">
          <Label htmlFor="course-patient">{t('course.patient')}</Label>
          <Select
            id="course-patient"
            options={patientOptions}
            value={selectedPatient}
            onValueChange={setSelectedPatient}
            placeholder={patients.isLoading ? t('common.loading') : undefined}
            disabled={patients.isLoading}
          />
        </div>
      ) : null}

      {packageProducts.length > 0 ? (
        <div className="space-y-1.5">
          <Label htmlFor="course-product">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="size-4 text-violet-ink" aria-hidden="true" />
              {t('course.fromProduct')}
            </span>
          </Label>
          <Select
            id="course-product"
            options={productOptions}
            value={productId}
            onValueChange={handleProductChange}
          />
          <p className="text-xs text-muted-foreground">{t('course.fromProductHelp')}</p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="course-service">{t('course.service')}</Label>
        <Input
          id="course-service"
          value={serviceName}
          onChange={(e) => {
            setServiceName(e.target.value);
            setProductId(MANUAL_OPTION);
          }}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="course-sessions">{t('course.sessionsTotal')}</Label>
          <Input
            id="course-sessions"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={sessionsTotal}
            onChange={(e) => {
              setSessionsTotal(Number(e.target.value) || 0);
              setProductId(MANUAL_OPTION);
            }}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="course-price">{t('course.pricePaid')}</Label>
          <Input
            id="course-price"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={pricePaid}
            onChange={(e) => {
              setPricePaid(Number(e.target.value) || 0);
              setProductId(MANUAL_OPTION);
            }}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="course-expires">{t('course.expiresAt')}</Label>
        <Input
          id="course-expires"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>

      <FormError>{error}</FormError>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
