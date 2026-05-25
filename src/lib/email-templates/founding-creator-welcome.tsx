import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import { main, container, brandMark, h1, text, button, footer } from './_brand'

interface Props {
  creatorName: string
  foundingNumber: number
  studioUrl: string
}

export const FoundingCreatorWelcomeEmail = ({ creatorName, foundingNumber, studioUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`You're Founding Creator #${foundingNumber} — locked at 50% for 24 months`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandMark}>Travidz</Text>
        <Heading style={h1}>Welcome, Founding Creator #{foundingNumber} 👑</Heading>
        <Text style={text}>
          Hey {creatorName}, you're one of the first 5,000 creators on Travidz. You keep
          <strong> 50% of every booking commission for the next 24 months</strong>, locked
          in. No tenure ladder, no thresholds — just keep posting.
        </Text>
        <Text style={text}>
          After 24 months you stay at 50% as a <strong>Power Creator</strong> as long as you
          keep posting at least <strong>1 video a month</strong> and your videos drive at
          least <strong>£25,000</strong> in rolling 12-month bookings. There's a 60-day
          grace period if you slip — so a quiet stretch won't cost you the rate.
        </Text>
        <Text style={text}>
          Post your first travel video to start earning — confirmed bookings on your deals
          will pay out into your earnings ledger.
        </Text>
        <Button style={button} href={studioUrl}>Open Studio</Button>
        <Text style={footer}>
          You're receiving this because you joined as a Travidz creator. Manage email
          preferences from Settings.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default FoundingCreatorWelcomeEmail
