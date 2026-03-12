import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const PageHeader = ({ title, description, breadcrumbs = [], actions }) => {
    return (
        <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
            {breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                    {breadcrumbs.map((item, i) => (
                        <span key={i} className="flex items-center gap-1.5">
                            {i > 0 && <ChevronRight className="h-3 w-3" />}
                            {item.href ? (
                                <Link to={item.href} className="hover:text-foreground transition-colors no-underline text-muted-foreground">{item.label}</Link>
                            ) : (
                                <span className="text-foreground font-medium">{item.label}</span>
                            )}
                        </span>
                    ))}
                </nav>
            )}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                    {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
                </div>
                {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
            </div>
        </motion.div>
    );
};

export default PageHeader;
