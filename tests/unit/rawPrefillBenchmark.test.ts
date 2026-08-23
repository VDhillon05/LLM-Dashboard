import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { BenchmarkModel, BenchmarkResult } from '@/types/benchmark'

async function readRawPrefillBenchmark(filename: string): Promise<BenchmarkResult> {
  const filePath = path.resolve(
    process.cwd(),
    'public',
    'benchmark-cache',
    'nvidia-rtx-3080',
    'prefill',
    'raw',
    filename,
  )
  const text = await readFile(filePath, 'utf8')
  const results = JSON.parse(text) as unknown

  if (!Array.isArray(results) || results.length === 0) {
    throw new Error(`Expected ${filename} to contain at least one benchmark result.`)
  }

  return BenchmarkResult.fromRaw(results[0] as Record<string, unknown>)
}

describe('raw RTX 3080 prefill benchmark results', () => {
  it('extracts the Llama prefill benchmark result into the benchmark model classes', async () => {
    const result = await readRawPrefillBenchmark(
      'Llama-3.2-3B-Instruct-Q8_0_p1024_b2048_ub1024_n0_r100.json',
    )

    expect(result).toBeInstanceOf(BenchmarkResult)
    expect(result.model).toBeInstanceOf(BenchmarkModel)
    expect(result.model.modelType).toBe('llama 3B Q8_0')
    expect(result.model.modelSize).toBe(3414061312)
    expect(result.model.modelNParams).toBe(3212749888)
    expect(result.gpuInfo).toBe('NVIDIA GeForce RTX 3080')
    expect(result.nPrompt).toBe(1024)
    expect(result.nGen).toBe(0)
    expect(result.nDepth).toBe(0)
    expect(result.nBatch).toBe(2048)
    expect(result.nUbatch).toBe(1024)
    expect(result.testTime).toBe('2026-07-28T23:39:14Z')
    expect(result.avgNs).toBe(95260653)
    expect(result.stddevNs).toBe(437382)
    expect(result.avgTs).toBeCloseTo(10749.674264, 6)
    expect(result.stddevTs).toBeCloseTo(48.481576, 6)
    expect(result.samplesNs[0]).toBe(98505100)
    expect(result.samplesTs[0]).toBeCloseTo(10395.4, 1)
  })
})
