import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AnimatePresence, motion } from 'motion/react';
import * as React from 'react';
import { cn } from '@renderer/lib/utils';
const CharacterMorph = React.forwardRef(({ texts, reserveTexts = [], className, interval = 3000, staggerDelay = 0.03, charDuration = 0.5 }, ref) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const currentText = texts[currentIndex] || '';
    const normalizedStaggerDelay = Math.max(0, staggerDelay);
    const maxTotalStagger = 0.24;
    const perCharDelay = currentText.length > 1
        ? Math.min(normalizedStaggerDelay, maxTotalStagger / (currentText.length - 1))
        : 0;
    React.useEffect(() => {
        if (texts.length <= 1)
            return undefined;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % texts.length);
        }, interval);
        return () => clearInterval(timer);
    }, [interval, texts.length]);
    const widthSource = [...texts, ...reserveTexts];
    return (_jsxs("div", { ref: ref, className: cn('relative inline-grid whitespace-nowrap', className), children: [_jsx("span", { "aria-hidden": "true", className: "pointer-events-none invisible col-start-1 row-start-1 grid", children: widthSource.map((text, index) => (_jsx("span", { className: "col-start-1 row-start-1", children: text.split(' ').join('\u00A0') }, `${index}-${text}`))) }), _jsx("span", { className: "col-start-1 row-start-1 justify-self-center", children: _jsx(AnimatePresence, { mode: "popLayout", children: currentText.split('').map((char, i) => (_jsx(motion.span, { initial: { opacity: 0, y: 20, filter: 'blur(8px)', rotateX: -90 }, animate: { opacity: 1, y: 0, filter: 'blur(0px)', rotateX: 0 }, exit: { opacity: 0, y: -20, filter: 'blur(8px)', rotateX: 90 }, transition: {
                            duration: charDuration,
                            delay: i * perCharDelay,
                            ease: [0.215, 0.61, 0.355, 1]
                        }, className: "inline-block", style: { transformStyle: 'preserve-3d' }, children: char === ' ' ? '\u00A0' : char }, `${currentIndex}-${currentText}-${i}`))) }) })] }));
});
CharacterMorph.displayName = 'CharacterMorph';
export { CharacterMorph };
