'use client'

interface LineSelectorProps {
  onLineChange: (line: string, subLine: string) => void;
}

export default function LineSelector({ onLineChange }: LineSelectorProps) {
  // Component implementation will be added later
  return (
    <div>
      <select onChange={(e) => onLineChange(e.target.value, '')}>
        <option value="">Select Line</option>
        <option value="Aussie">Aussie</option>
        <option value="Yankee">Yankee</option>
        <option value="Seasoning">Seasoning</option>
        <option value="Texas">Texas</option>
      </select>
    </div>
  );
} 