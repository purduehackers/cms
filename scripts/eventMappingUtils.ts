export function inferEventType(title: string) {
    const lower = title.toLowerCase();

    if (lower.includes("hack night")) return "hack-night";
    if (lower.includes("workshop")) return "workshop";
    if (lower.includes("hack lite")) return "hack-lite";

    const words = title.trim().split(/\s+/);
    return words[words.length - 1].toLowerCase();
}

interface DescriptionType {
    root: {
      type: string;
      children: {
        type: any;
        version: number;
        [k: string]: unknown;
      }[];
      direction: ('ltr' | 'rtl') | null;
      format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | '';
      indent: number;
      version: number;
    };
    [k: string]: unknown;
}
export function toLexical(text: string) {
    const description: DescriptionType = {
        root: {
            children: [
                {
                    children: [
                        {
                            detail: 0,
                            format: 0,
                            mode: "normal",
                            style: "",
                            text,
                            type: "text",
                            version: 1
                        }
                    ],
                    direction: null,
                    format: "",
                    indent: 0,
                    type: "paragraph",
                    version: 1
                }
            ],
            direction: null,
            format: "",
            indent: 0,
            type: "root",
            version: 1
        }
    };
    return description;
}

export function mapImages(recapImages: any[], imageMap: Record<string, number>) {
    if (!recapImages) return [];

    return recapImages
        .map((img) => {
            const filename = img._sanityAsset?.split("/").pop();
            const id = imageMap[filename];

            if (!id) return null;

            return {
                image: id
            };
        })
        .filter(Boolean);
}

export function mapStats(event: any) {
    const stats = [];

    if (event.stat1) {
        stats.push({
            label: event.stat1.label,
            data: event.stat1.data
        });
    }
    if (event.stat2) {
        stats.push({
            label: event.stat2.label,
            data: event.stat2.data
        });
    }
    if (event.stat3) {
        stats.push({
            label: event.stat3.label,
            data: event.stat3.data
        });
    }

    return stats;
}