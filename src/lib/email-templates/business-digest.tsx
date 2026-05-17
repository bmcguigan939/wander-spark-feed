import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import { main, container, brandMark, h1, text, button, footer } from './_brand'

interface Props {
  businessName: string
  checksRun: number
  matchesIssued: number
  redemptionsConfirmed: number
  totalCommissionCents: number
  currency: string
  auditUrl: string
}

const fmt = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP' })
    .format(cents / 100)

export const BusinessDigestEmail = ({
  businessName,
  checksRun,
  matchesIssued,
  redemptionsConfirmed,
  totalCommissionCents,
  currency,
  auditUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your Travidz week: ${checksRun} price checks, ${matchesIssued} matches issued`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandMark}>Travidz</Text>
        <Heading style={h1}>Your weekly best-price summary</Heading>
        <Text style={text}>
          Hi {businessName}, here's what Travidz did for you over the last 7 days:
        </Text>
        <Text style={text}>
          • <strong>{checksRun}</strong> parity checks against OTAs<br />
          • <strong>{matchesIssued}</strong> price-match codes issued<br />
          • <strong>{redemptionsConfirmed}</strong> bookings you confirmed<br />
          • <strong>{fmt(totalCommissionCents, currency)}</strong> commission accrued (8%)
        </Text>
        <Button style={button} href={auditUrl}>View price-match audit</Button>
        <Text style={footer}>
          You're receiving this because you have an active business on Travidz.
          Manage email preferences in Settings.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default BusinessDigestEmail