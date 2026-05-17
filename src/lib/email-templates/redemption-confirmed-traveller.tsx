import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import { main, container, brandMark, h1, text, button, footer } from './_brand'

interface Props {
  travellerName: string
  businessName: string
  dealTitle: string
  dealUrl: string
}

export const RedemptionConfirmedTravellerEmail = ({
  travellerName,
  businessName,
  dealTitle,
  dealUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your booking with {businessName} is confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandMark}>Travidz</Text>
        <Heading style={h1}>Booking confirmed</Heading>
        <Text style={text}>
          Hi {travellerName}, <strong>{businessName}</strong> has confirmed your booking for
          <strong> {dealTitle}</strong>. Have an incredible trip — and don't forget to share your
          own video when you get back.
        </Text>
        <Button style={button} href={dealUrl}>View deal</Button>
        <Text style={footer}>
          You're receiving this because you redeemed a code on Travidz. Manage email
          preferences from Settings.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RedemptionConfirmedTravellerEmail