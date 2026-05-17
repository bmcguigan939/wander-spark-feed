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
    <Preview>You're Founding Creator #{foundingNumber} — locked at 50% for life</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandMark}>Travidz</Text>
        <Heading style={h1}>Welcome, Founding Creator #{foundingNumber} 👑</Heading>
        <Text style={text}>
          Hey {creatorName}, you're one of the first 500 creators on Travidz — and that earns
          you a lifetime perk. You keep <strong>50% of every booking commission</strong>,
          forever. No tenure ladder, no thresholds, no expiry.
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
