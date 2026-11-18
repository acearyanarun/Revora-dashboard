import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { demoApi, type RevoraApi } from '../services/api'
import { DemoExecutionEngine } from '../services/execution/demoEngine'

const fastApi: RevoraApi = { ...demoApi, executionEngine: new DemoExecutionEngine({ lineDelayMs: 0 }) }

async function renderAt(hash: string) {
  window.location.hash = hash
  render(<App api={fastApi} />)
  await screen.findByRole('navigation', { name: 'Primary' })
}

describe('App', () => {
  it('renders the overview with demo labeling and the investigations table', async () => {
    await renderAt('#/')
    expect(screen.getByRole('heading', { name: 'Engineering Overview' })).toBeInTheDocument()
    expect(screen.getByText(/Investigate connected-device failures/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Demo mode/i).length).toBeGreaterThan(0)
    const table = screen.getByRole('table')
    expect(within(table).getByText('INC-001')).toBeInTheDocument()
    expect(within(table).getByText('Insufficient Evidence')).toBeInTheDocument()
  })

  it('navigates between primary sections', async () => {
    await renderAt('#/')
    fireEvent.click(screen.getByRole('link', { name: /Regression Library/ }))
    expect(await screen.findByRole('heading', { name: 'Regression Library' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: /Investigations/ }))
    expect(await screen.findByRole('heading', { name: 'Investigations' })).toBeInTheDocument()
  })

  it('runs the explicitly simulated reproduction without claiming actual firmware was executed', async () => {
    await renderAt('#/lab/INC-001')
    // Generate the scenario (step reveal uses an interval).
    const gen = screen.getAllByRole('button', { name: /Generate Test/ })[0]
    await act(async () => {
      fireEvent.click(gen)
      await new Promise((r) => setTimeout(r, 2000))
    })
    const run = screen.getByRole('button', { name: /Run Reproduction/ })
    expect(run).toBeEnabled()
    await act(async () => {
      fireEvent.click(run)
    })
    expect(await screen.findByText('Simulated Target Failure')).toBeInTheDocument()
    expect(screen.getByText(/scripted browser demonstration, not evidence/i)).toBeInTheDocument()
    expect(screen.queryByText(/^Test Failed$/)).not.toBeInTheDocument()
  }, 10000)

  it('distinguishes hypotheses from confirmed findings on the investigation page', async () => {
    await renderAt('#/investigations/INC-001')
    expect(screen.getByText('Hypotheses')).toBeInTheDocument()
    expect(screen.getByText('Confirmed Findings')).toBeInTheDocument()
    expect(screen.getByText(/Nothing confirmed yet/)).toBeInTheDocument()
  })

  it('creates an investigation from evidence without allowing a fake browser reproduction', async () => {
    await renderAt('#/investigations')
    fireEvent.click(screen.getByRole('button', { name: 'New investigation' }))
    fireEvent.change(screen.getByPlaceholderText('Telemetry stops after Wi-Fi returns'), { target: { value: 'Custom Wi-Fi outage' } })
    fireEvent.change(screen.getByPlaceholderText('ESP32 energy monitor'), { target: { value: 'Custom monitor' } })
    fireEvent.change(screen.getByPlaceholderText('v1.4.2 or commit SHA'), { target: { value: 'abc123' } })
    fireEvent.change(screen.getByPlaceholderText(/After a 10-second outage/), { target: { value: 'MQTT telemetry does not recover.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create investigation' }))
    expect(await screen.findByRole('heading', { name: 'Custom Wi-Fi outage' })).toBeInTheDocument()
    const serial = new File([
      'I (1000) wifi:WIFI_EVENT_STA_CONNECTED\n',
      'W (2000) wifi:WIFI_EVENT_STA_DISCONNECTED\n',
      'I (12000) wifi:WIFI_EVENT_STA_CONNECTED\n',
      'I (13000) esp_netif:IP_EVENT_STA_GOT_IP\n',
    ], 'incident.log', { type: 'text/plain' })
    const upload = document.querySelector('input[type="file"]') as HTMLInputElement
    await act(async () => fireEvent.change(upload, { target: { files: [serial] } }))
    expect(await screen.findByText('Wi-Fi disconnected')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Generate Reproduction Scenario' })[0])
    expect(await screen.findByText('Review candidate test')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Run Reproduction' })).toBeDisabled()
    expect(screen.getByText(/A physical runner is not connected/)).toBeInTheDocument()
  })
})
