import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
  plugins: [
    vue(),
    obfuscatorPlugin({
      include: ['src/**/*.js', 'src/**/*.vue'],
      exclude: [/node_modules/],
      apply: 'build', // 개발 환경(dev)이 아닌 배포(build) 시에만 적용됩니다.
      options: {
        compact: true, // 코드 압축
        controlFlowFlattening: true, // 코드의 흐름을 복잡하게 섞어 분석을 어렵게 만듦
        controlFlowFlatteningThreshold: 0.5,
        deadCodeInjection: true, // 의미 없는 가짜 코드를 무작위로 삽입
        deadCodeInjectionThreshold: 0.4,
        debugProtection: true, // 개발자 도구가 열리면 debugger를 무한 실행시켜 브라우저를 멈추게 함
        debugProtectionInterval: 4000, // 4초마다 디버거 보호 로직 실행
        disableConsoleOutput: true, // console.log 완전 무력화
        identifierNamesGenerator: 'hexadecimal', // 변수와 함수명을 16진수 난수로 변경 (예: _0xabc123)
        log: false,
        numbersToExpressions: true, // 숫자 값을 복잡한 수식으로 변환
        selfDefending: true, // 코드를 예쁘게 정렬(beautify)해서 보려고 하면 작동을 멈춤
        simplify: true,
        splitStrings: true, // 긴 문자열 쪼개기
        stringArray: true, // 문자열을 배열로 추출하여 숨김
        stringArrayCallsTransform: true,
        stringArrayEncoding: ['base64'], // 문자열 배열을 base64로 암호화
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 1,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 2,
        stringArrayWrappersType: 'variable',
        stringArrayThreshold: 0.75,
        unicodeEscapeSequence: false,
      },
    }),
  ],
});
