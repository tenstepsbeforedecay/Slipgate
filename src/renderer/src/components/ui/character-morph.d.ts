import * as React from 'react';
interface CharacterMorphProps {
    texts: string[];
    reserveTexts?: string[];
    className?: string;
    interval?: number;
    staggerDelay?: number;
    charDuration?: number;
}
declare const CharacterMorph: React.ForwardRefExoticComponent<CharacterMorphProps & React.RefAttributes<HTMLDivElement>>;
export { CharacterMorph };
