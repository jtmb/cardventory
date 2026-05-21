terraform {
  required_providers {
    linode = {
      source  = "linode/linode"
      version = "~> 2.0"
    }
  }
}

provider "linode" {
  token = var.linode_token
}

locals {
  # Extract the bare hostname from nextauth_url for the Traefik Host() routing rule.
  # e.g. "https://cards.example.com" -> "cards.example.com"
  app_hostname = trimprefix(trimprefix(var.nextauth_url, "https://"), "http://")
}

resource "linode_instance" "cardventory" {
  label           = "cardventory"
  image           = "linode/ubuntu24.04"
  region          = var.region
  type            = var.instance_type
  authorized_keys = [var.ssh_public_key]
  watchdog_enabled = true
  tags            = ["cardventory"]

  metadata {
    user_data = base64encode(templatefile("${path.module}/cloud-init.tftpl", {
      auth_secret             = var.auth_secret
      nextauth_url            = var.nextauth_url
      cloudflare_tunnel_token = var.cloudflare_tunnel_token
      ghcr_username           = var.ghcr_username
      ghcr_token              = var.ghcr_token
      ebay_client_id          = var.ebay_client_id
      ebay_client_secret      = var.ebay_client_secret
      app_hostname            = local.app_hostname
    }))
  }
}

resource "linode_firewall" "cardventory" {
  label = "cardventory-fw"

  inbound_policy  = "DROP"
  outbound_policy = "ACCEPT"

  inbound {
    label    = "ssh"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "22"
    ipv4     = ["0.0.0.0/0"]
    ipv6     = ["::/0"]
  }

  linodes = [linode_instance.cardventory.id]
}
