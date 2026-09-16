export async function resolve(specifier, context, nextResolve) {
  let modifiedSpecifier = specifier;
  if (specifier === '../../types') {
    modifiedSpecifier = '../../types/index.ts';
  } else if (specifier === './MicAnalyzer') {
    modifiedSpecifier = './MicAnalyzer.ts';
  } else if (specifier === './ProceduralSFX') {
    modifiedSpecifier = './ProceduralSFX.ts';
  } else if (specifier === './ProceduralMusic') {
    modifiedSpecifier = './ProceduralMusic.ts';
  }
  return nextResolve(modifiedSpecifier, context);
}
