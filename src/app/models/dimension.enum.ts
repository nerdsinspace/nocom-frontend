export enum Dimension {
  NETHER = -1,
  OVERWORLD,
  END
}

export const allDimensions = [Dimension.NETHER, Dimension.OVERWORLD, Dimension.END];

export function getDimensionIdByName(dimension: string): Dimension {
  switch (dimension.toLowerCase()) {
    case 'nether':
      return Dimension.NETHER;
    case 'overworld':
      return Dimension.OVERWORLD;
    case 'end':
      return Dimension.END;
  }
  return null;
}

export function getDimensionPrettyName(dimension: Dimension): string {
  switch (dimension) {
    case Dimension.NETHER:
      return 'Nether';
    case Dimension.OVERWORLD:
      return 'Overworld';
    case Dimension.END:
      return 'End';
  }
  throw 'unknown dimension';
}

export function fixDimensionMember(o: {dimension?: Dimension | string}) {
  // the data from the api uses strings to represent dimensions
  // we must convert them to the enum type
  if (typeof o.dimension === 'string') {
    o.dimension = Dimension[o.dimension];
  }
}
