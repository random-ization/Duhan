import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';

export const useTranslation = () => {
    const { language } = useAuth();
    const t = getLabels(language);
    return { t, i18n: { language } };
};

export default useTranslation;
