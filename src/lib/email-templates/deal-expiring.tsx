import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import { main, container, brandMark, h1, text, button, footer } from './_brand'

interface Props {
  businessName: string
  dealTitle: string
  daysLeft: number
  editUrl: string
}

export const DealExpiringEmail = ({ businessName, dealTitle, daysLeft, editUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your deal "{dealTitle}" expires in {daysLeft} day{daysLeft === 1 ? '' : 's'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandMark}>Travidz</Text>
        <Heading style={h1}>Your deal expires soon</Heading>
        <Text style={text}>
          Hi {businessName}, your deal <strong>{dealTitle}</strong> expires in{' '}
          <strong>{daysLeft} day{daysLeft === 1 ? '' : 's'}</strong>. Extend it now to keep
          appearing in creator promotions and the discovery feed.
        </Text>
        <Button style={button} href={editUrl}>Extend deal</Button>
        <Text style={footer}>
          You're receiving this because you own a deal on Travidz. Manage email preferences
          from Settings.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default DealExpiringEmail