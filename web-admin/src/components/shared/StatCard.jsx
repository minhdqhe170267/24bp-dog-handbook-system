import { motion } from 'framer-motion';
import { cn } from '../../utils/utils';

const StatCard = ({ title, value, icon: Icon, description, trend, className, index = 0 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
            <div className={cn(
                'group bg-card rounded-xl border border-border/60 transition-all duration-300 hover:shadow-elevated overflow-hidden relative cursor-default',
                className
            )}>
                <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="p-5 relative">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1.5">
                            <p className="text-sm font-medium text-muted-foreground">{title}</p>
                            <motion.p
                                className="text-3xl font-bold tracking-tight text-foreground"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                            >
                                {value}
                            </motion.p>
                            {description && <p className="text-xs text-muted-foreground">{description}</p>}
                            {trend && (
                                <div className={cn(
                                    'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                                    trend.value >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                                )}>
                                    {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
                                </div>
                            )}
                        </div>
                        <div className="h-11 w-11 rounded-xl bg-accent/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                            <Icon className="h-5 w-5 text-accent" />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default StatCard;
