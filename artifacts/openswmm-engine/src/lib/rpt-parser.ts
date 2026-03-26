export interface RptSection {
  title: string;
  headers: string[];
  rows: string[][];
  raw: string;
}

export interface RptTimeSeries {
  title: string;
  elementName: string;
  variable: string;
  times: string[];
  values: number[];
}

export function parseRptSections(rptText: string): RptSection[] {
  const sections: RptSection[] = [];
  const lines = rptText.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith('***') || line.startsWith('---') || line === '') {
      i++;
      continue;
    }

    if (isTableHeader(lines, i)) {
      const section = extractTable(lines, i);
      if (section) {
        sections.push(section);
        i = section._endIdx!;
        continue;
      }
    }
    i++;
  }

  return sections;
}

interface ExtractedSection extends RptSection {
  _endIdx?: number;
}

function isTableHeader(lines: string[], idx: number): boolean {
  for (let j = idx + 1; j < Math.min(idx + 4, lines.length); j++) {
    if (/^[\s]*[-]{3,}/.test(lines[j]) && lines[j].includes('---')) {
      return true;
    }
  }
  return false;
}

function extractTable(lines: string[], startIdx: number): ExtractedSection | null {
  let i = startIdx;
  let title = '';

  while (i > 0 && lines[i - 1].trim() === '') i--;
  let titleSearchIdx = i;
  while (titleSearchIdx > 0) {
    titleSearchIdx--;
    const l = lines[titleSearchIdx].trim();
    if (l.startsWith('***') || l.startsWith('---')) break;
    if (l !== '') {
      title = l;
      break;
    }
  }

  i = startIdx;

  let separatorIdx = -1;
  for (let j = i; j < Math.min(i + 5, lines.length); j++) {
    if (/^\s*[-]+(\s+[-]+)*\s*$/.test(lines[j])) {
      separatorIdx = j;
      break;
    }
  }

  if (separatorIdx === -1) return null;

  const headerLines: string[] = [];
  for (let j = i; j < separatorIdx; j++) {
    if (lines[j].trim() !== '') {
      headerLines.push(lines[j]);
    }
  }

  if (headerLines.length === 0) return null;

  const headerLine = headerLines[headerLines.length - 1];
  const sepLine = lines[separatorIdx];
  const colRanges = getColumnRanges(sepLine);
  const headers = colRanges.map(([start, end]) =>
    headerLine.substring(start, Math.min(end, headerLine.length)).trim()
  );

  const rows: string[][] = [];
  const rawLines = [headerLine, sepLine];
  let j = separatorIdx + 1;

  while (j < lines.length) {
    const l = lines[j];
    if (l.trim() === '' || l.trim().startsWith('***') || l.trim().startsWith('---')) {
      break;
    }
    rawLines.push(l);
    const row = colRanges.map(([start, end]) =>
      l.substring(start, Math.min(end, l.length)).trim()
    );
    if (row.some(cell => cell !== '')) {
      rows.push(row);
    }
    j++;
  }

  if (rows.length === 0) return null;

  return {
    title: title || 'Untitled Section',
    headers: headers.filter(h => h !== ''),
    rows,
    raw: rawLines.join('\n'),
    _endIdx: j
  };
}

function getColumnRanges(sepLine: string): [number, number][] {
  const ranges: [number, number][] = [];
  let i = 0;
  while (i < sepLine.length) {
    if (sepLine[i] === '-') {
      const start = i;
      while (i < sepLine.length && sepLine[i] === '-') i++;
      ranges.push([start, i]);
    } else {
      i++;
    }
  }
  return ranges;
}

export function extractTimeSeries(rptText: string): RptTimeSeries[] {
  const series: RptTimeSeries[] = [];
  const nodeFlowPattern = /<<< Node\s+(\S+)\s+>>>/g;
  const linkFlowPattern = /<<< Link\s+(\S+)\s+>>>/g;

  const sections = parseRptSections(rptText);

  for (const section of sections) {
    if (section.title.includes('Node Results') ||
        section.title.includes('Link Results') ||
        section.title.includes('Subcatchment Results')) {

      const timeIdx = section.headers.findIndex(h =>
        h.toLowerCase().includes('date') || h.toLowerCase().includes('time') ||
        h.toLowerCase().includes('elapsed')
      );

      for (let col = 0; col < section.headers.length; col++) {
        if (col === timeIdx) continue;
        const header = section.headers[col];
        if (!header) continue;

        const times: string[] = [];
        const values: number[] = [];

        for (const row of section.rows) {
          const timeVal = timeIdx >= 0 ? row[timeIdx] : String(times.length);
          const numVal = parseFloat(row[col]);
          if (!isNaN(numVal)) {
            times.push(timeVal || String(times.length));
            values.push(numVal);
          }
        }

        if (values.length > 1) {
          series.push({
            title: `${section.title} - ${header}`,
            elementName: section.title,
            variable: header,
            times,
            values
          });
        }
      }
    }
  }

  [nodeFlowPattern, linkFlowPattern].forEach(pattern => {
    let match;
    while ((match = pattern.exec(rptText)) !== null) {
      const elemName = match[1];
      const startPos = match.index + match[0].length;
      const nextSection = rptText.indexOf('<<<', startPos);
      const endPos = nextSection > 0 ? nextSection : rptText.length;
      const block = rptText.substring(startPos, endPos);
      const blockSections = parseRptSections(block);

      for (const bs of blockSections) {
        for (let col = 1; col < bs.headers.length; col++) {
          const times: string[] = [];
          const values: number[] = [];
          for (const row of bs.rows) {
            const v = parseFloat(row[col]);
            if (!isNaN(v)) {
              times.push(row[0] || String(times.length));
              values.push(v);
            }
          }
          if (values.length > 1) {
            series.push({
              title: `${elemName} - ${bs.headers[col]}`,
              elementName: elemName,
              variable: bs.headers[col],
              times,
              values
            });
          }
        }
      }
    }
  });

  return series;
}
